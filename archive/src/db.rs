use crate::{IngestedSession, laps::build_stints};
use anyhow::Context;
use chrono::Utc;
use rusqlite::{Connection, params};
use serde_json::Value;
use std::path::Path;

pub fn open(path: &Path) -> anyhow::Result<Connection> {
    let connection = Connection::open(path)?;
    migrate(&connection)?;
    Ok(connection)
}
pub fn migrate(db: &Connection) -> anyhow::Result<()> {
    db.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY,path TEXT NOT NULL UNIQUE,year INTEGER NOT NULL,meeting TEXT NOT NULL,country TEXT,circuit TEXT,kind TEXT NOT NULL,name TEXT NOT NULL,start_utc TEXT,end_utc TEXT,total_laps INTEGER,complete INTEGER NOT NULL DEFAULT 0,source_file TEXT NOT NULL,ingested_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS drivers(session_id INTEGER NOT NULL REFERENCES sessions(id),nr TEXT NOT NULL,tla TEXT,full_name TEXT,team_name TEXT,team_colour TEXT,PRIMARY KEY(session_id,nr));
 CREATE TABLE IF NOT EXISTS laps(session_id INTEGER NOT NULL REFERENCES sessions(id),driver_nr TEXT NOT NULL,lap INTEGER NOT NULL,lap_time_ms INTEGER,s1_ms INTEGER,s2_ms INTEGER,s3_ms INTEGER,position INTEGER,gap_leader_ms INTEGER,compound TEXT,tyre_age INTEGER,pitted INTEGER NOT NULL DEFAULT 0,utc TEXT NOT NULL,speed_trap_kph INTEGER,PRIMARY KEY(session_id,driver_nr,lap)); CREATE INDEX IF NOT EXISTS idx_laps_session ON laps(session_id,lap);
 CREATE TABLE IF NOT EXISTS stints(session_id INTEGER NOT NULL,driver_nr TEXT NOT NULL,stint INTEGER NOT NULL,compound TEXT,start_lap INTEGER,end_lap INTEGER,lap_count INTEGER,best_ms INTEGER,avg_ms REAL,deg_ms_per_lap REAL,PRIMARY KEY(session_id,driver_nr,stint));
 CREATE TABLE IF NOT EXISTS events(session_id INTEGER NOT NULL,utc TEXT NOT NULL,kind TEXT NOT NULL,driver_nr TEXT NOT NULL DEFAULT '',lap INTEGER,message TEXT,PRIMARY KEY(session_id,utc,kind,driver_nr));
 CREATE TABLE IF NOT EXISTS weather(session_id INTEGER NOT NULL,utc TEXT NOT NULL,air_temp REAL,track_temp REAL,rainfall REAL,wind_speed REAL,humidity REAL,PRIMARY KEY(session_id,utc));
 CREATE TABLE IF NOT EXISTS telemetry(session_id INTEGER NOT NULL,driver_nr TEXT NOT NULL,ts_ms INTEGER NOT NULL,lap INTEGER,speed INTEGER,rpm INTEGER,gear INTEGER,throttle INTEGER,brake INTEGER,PRIMARY KEY(session_id,driver_nr,ts_ms)); CREATE INDEX IF NOT EXISTS idx_tel_lap ON telemetry(session_id,driver_nr,lap);")?;
    // Additive migrations. `user_version` advances as schema grows; each step is
    // idempotent so re-opening an already-migrated DB is a no-op.
    let version: i64 = db.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    if version < 2 {
        // v2: per-lap speed trap. CREATE above already includes it for fresh DBs;
        // older DBs need the column appended.
        if !column_exists(db, "laps", "speed_trap_kph")? {
            db.execute_batch("ALTER TABLE laps ADD COLUMN speed_trap_kph INTEGER;")?;
        }
    }
    db.execute_batch("PRAGMA user_version=2;")?;
    Ok(())
}

fn column_exists(db: &Connection, table: &str, column: &str) -> anyhow::Result<bool> {
    let mut stmt = db.prepare(&format!("PRAGMA table_info({table})"))?;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        if row.get::<_, String>(1)? == column {
            return Ok(true);
        }
    }
    Ok(false)
}

pub fn persist(db: &mut Connection, session: &IngestedSession) -> anyhow::Result<i64> {
    let info = session
        .state
        .get("SessionInfo")
        .context("recording has no SessionInfo")?;
    let path = info
        .get("Path")
        .and_then(Value::as_str)
        .context("SessionInfo.Path missing")?;
    let year = path
        .split('/')
        .find_map(|p| p.parse::<i64>().ok())
        .unwrap_or(0);
    let meeting = info
        .pointer("/Meeting/Name")
        .and_then(Value::as_str)
        .unwrap_or("Unknown");
    let kind = info
        .get("Type")
        .and_then(Value::as_str)
        .unwrap_or("Unknown");
    let name = info.get("Name").and_then(Value::as_str).unwrap_or(kind);
    let tx = db.transaction()?;
    tx.execute("INSERT INTO sessions(path,year,meeting,country,circuit,kind,name,start_utc,end_utc,total_laps,complete,source_file,ingested_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(path) DO UPDATE SET year=excluded.year,meeting=excluded.meeting,country=excluded.country,circuit=excluded.circuit,kind=excluded.kind,name=excluded.name,start_utc=excluded.start_utc,end_utc=excluded.end_utc,total_laps=excluded.total_laps,complete=excluded.complete,source_file=excluded.source_file,ingested_at=excluded.ingested_at",params![path,year,meeting,info.pointer("/Meeting/Country/Name").and_then(Value::as_str),info.pointer("/Meeting/Circuit/ShortName").and_then(Value::as_str),kind,name,info.get("StartDate").and_then(Value::as_str),info.get("EndDate").and_then(Value::as_str),session.state.pointer("/LapCount/TotalLaps").and_then(Value::as_i64),session.complete as i64,session.source_file.to_string_lossy(),Utc::now().to_rfc3339()])?;
    let id: i64 = tx.query_row("SELECT id FROM sessions WHERE path=?", [path], |r| r.get(0))?;
    for table in [
        "drivers",
        "laps",
        "stints",
        "events",
        "weather",
        "telemetry",
    ] {
        tx.execute(&format!("DELETE FROM {table} WHERE session_id=?"), [id])?;
    }
    if let Some(drivers) = session.state.get("DriverList").and_then(Value::as_object) {
        for (nr, d) in drivers {
            tx.execute(
                "INSERT INTO drivers VALUES(?,?,?,?,?,?)",
                params![
                    id,
                    nr,
                    d.get("Tla").and_then(Value::as_str),
                    d.get("FullName").and_then(Value::as_str),
                    d.get("TeamName").and_then(Value::as_str),
                    d.get("TeamColour").and_then(Value::as_str)
                ],
            )?;
        }
    }
    for (nr, laps) in &session.laps {
        for l in laps {
            tx.execute(
                "INSERT INTO laps(session_id,driver_nr,lap,lap_time_ms,s1_ms,s2_ms,s3_ms,position,gap_leader_ms,compound,tyre_age,pitted,utc,speed_trap_kph) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                params![
                    id,
                    nr,
                    l.lap,
                    l.lap_time_ms,
                    l.sectors_ms[0],
                    l.sectors_ms[1],
                    l.sectors_ms[2],
                    l.position,
                    l.gap_to_leader_ms,
                    l.compound,
                    l.tyre_age,
                    l.pitted as i64,
                    l.utc,
                    l.speed_trap_kph
                ],
            )?;
        }
        for s in build_stints(laps) {
            tx.execute(
                "INSERT INTO stints VALUES(?,?,?,?,?,?,?,?,?,?)",
                params![
                    id,
                    nr,
                    s.stint,
                    s.compound,
                    s.start_lap,
                    s.end_lap,
                    s.lap_count,
                    s.best_ms,
                    s.avg_ms,
                    s.deg_ms_per_lap
                ],
            )?;
        }
    }
    for e in &session.events {
        tx.execute(
            "INSERT OR REPLACE INTO events VALUES(?,?,?,?,?,?)",
            params![
                id,
                e.utc,
                e.kind,
                e.driver_nr.as_deref().unwrap_or(""),
                e.lap,
                e.message
            ],
        )?;
    }
    for w in &session.weather {
        tx.execute(
            "INSERT OR REPLACE INTO weather VALUES(?,?,?,?,?,?,?)",
            params![
                id,
                w.utc,
                w.air_temp,
                w.track_temp,
                w.rainfall,
                w.wind_speed,
                w.humidity
            ],
        )?;
    }
    for s in &session.telemetry {
        tx.execute(
            "INSERT OR REPLACE INTO telemetry VALUES(?,?,?,?,?,?,?,?,?)",
            params![
                id,
                s.driver_nr,
                s.ts_ms,
                s.lap,
                s.speed,
                s.rpm,
                s.gear,
                s.throttle,
                s.brake
            ],
        )?;
    }
    tx.commit()?;
    Ok(id)
}

pub fn source_for(db: &Connection, path: &str) -> anyhow::Result<String> {
    Ok(db.query_row(
        "SELECT source_file FROM sessions WHERE path=?",
        [path],
        |r| r.get(0),
    )?)
}
