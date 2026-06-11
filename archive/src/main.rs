use anyhow::Context;
use clap::{Parser, Subcommand};
use std::{
    env,
    path::{Path, PathBuf},
    thread,
    time::{Duration, SystemTime},
};

#[derive(Parser)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}
#[derive(Subcommand)]
enum Command {
    Ingest { path: PathBuf },
    Watch,
    List,
    Rebuild { path: String },
}

fn main() -> anyhow::Result<()> {
    shared::tracing_subscriber();
    let cli = Cli::parse();
    let db_path =
        PathBuf::from(env::var("ARCHIVE_DB").unwrap_or_else(|_| "./archive.sqlite".into()));
    let mut db = archive::db::open(&db_path)?;
    match cli.command {
        Command::Ingest { path } => {
            for file in archive::reader::recording_files(&path)? {
                ingest(&mut db, &file)?;
            }
        }
        Command::List => {
            let mut stmt = db.prepare(
                "SELECT id,year,meeting,name,complete,path FROM sessions ORDER BY start_utc DESC",
            )?;
            let rows = stmt.query_map([], |r| {
                Ok((
                    r.get::<_, i64>(0)?,
                    r.get::<_, i64>(1)?,
                    r.get::<_, String>(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, i64>(4)?,
                    r.get::<_, String>(5)?,
                ))
            })?;
            for row in rows {
                let (id, year, meeting, name, complete, path) = row?;
                println!(
                    "{id:>4} {year} {:<32} {:<16} {} {path}",
                    meeting,
                    name,
                    if complete == 1 { "complete" } else { "partial" }
                );
            }
        }
        Command::Rebuild { path } => {
            let source = archive::db::source_for(&db, &path)?;
            ingest(&mut db, Path::new(&source))?;
        }
        Command::Watch => watch(&mut db)?,
    }
    Ok(())
}
fn ingest(db: &mut rusqlite::Connection, path: &Path) -> anyhow::Result<bool> {
    let session =
        archive::ingest_file(path).with_context(|| format!("ingesting {}", path.display()))?;
    let complete = session.complete;
    let id = archive::db::persist(db, &session)?;
    println!("ingested session {id} from {}", path.display());
    Ok(complete)
}
fn watch(db: &mut rusqlite::Connection) -> anyhow::Result<()> {
    let root = PathBuf::from(env::var("RECORDINGS_DIR").unwrap_or_else(|_| "./recordings".into()));
    let mut seen = std::collections::HashMap::new();
    loop {
        for file in archive::reader::recording_files(&root).unwrap_or_default() {
            let modified = std::fs::metadata(&file)?.modified()?;
            if seen.get(&file) == Some(&modified) {
                if modified.elapsed().unwrap_or_default() >= Duration::from_secs(60)
                    && let Ok(complete) = ingest(db, &file)
                {
                    seen.insert(file.clone(), SystemTime::UNIX_EPOCH);
                    if complete {
                        purge_if_needed(&file);
                    }
                }
            } else if seen.get(&file) != Some(&SystemTime::UNIX_EPOCH) {
                seen.insert(file, modified);
            }
        }
        thread::sleep(Duration::from_secs(10));
    }
}
fn purge_if_needed(path: &Path) {
    let days = env::var("RECORDING_RETENTION_DAYS")
        .ok()
        .and_then(|v| v.parse::<u64>().ok());
    if let Some(days) = days
        && std::fs::metadata(path)
            .and_then(|m| m.modified())
            .ok()
            .and_then(|m| m.elapsed().ok())
            .is_some_and(|age| age > Duration::from_secs(days * 86400))
    {
        let _ = std::fs::remove_file(path);
    }
}
