use std::{
    collections::VecDeque,
    env,
    fs::{self, File, OpenOptions},
    io::{BufWriter, Write},
    path::{Path, PathBuf},
    time::Duration,
};

use flate2::{Compression, write::GzEncoder};
use serde_json::{Value, json};
use tokio::sync::mpsc;
use tracing::warn;

const MAX_BUFFERED: usize = 5_000;

#[derive(Clone, Debug)]
pub enum RecorderMsg {
    Initial(Value),
    Update {
        topic: String,
        data: Value,
        timestamp: String,
    },
    Flush,
}

#[derive(Clone)]
pub struct RecorderHandle(mpsc::UnboundedSender<RecorderMsg>);

impl RecorderHandle {
    pub fn send(&self, message: RecorderMsg) {
        let _ = self.0.send(message);
    }
}

pub fn spawn_recorder() -> RecorderHandle {
    let enabled = env_bool("RECORDING_ENABLED", true);
    let root = PathBuf::from(env::var("RECORDINGS_DIR").unwrap_or_else(|_| "./recordings".into()));
    let gzip = env_bool("RECORDING_GZIP", true);
    spawn_recorder_with(root, enabled, gzip)
}

fn spawn_recorder_with(root: PathBuf, enabled: bool, gzip: bool) -> RecorderHandle {
    let (tx, mut rx) = mpsc::unbounded_channel();
    tokio::spawn(async move {
        if !enabled {
            while rx.recv().await.is_some() {}
            return;
        }
        let mut state = WriterState::new(root, gzip);
        let mut interval = tokio::time::interval(Duration::from_secs(1));
        loop {
            tokio::select! {
                Some(message) = rx.recv() => {
                    let flush = matches!(message, RecorderMsg::Flush);
                    if let Err(error) = state.handle(message) {
                        warn!(?error, "session recorder disabled until next snapshot");
                        state.disable();
                    }
                    if flush { break; }
                }
                _ = interval.tick() => {
                    if let Err(error) = state.flush() { warn!(?error, "failed to flush session recording"); }
                }
                else => break,
            }
        }
        let _ = state.close_current();
    });
    RecorderHandle(tx)
}

struct WriterState {
    root: PathBuf,
    gzip: bool,
    path: Option<String>,
    file_path: Option<PathBuf>,
    writer: Option<BufWriter<File>>,
    buffered: VecDeque<RecorderMsg>,
    disabled: bool,
}

impl WriterState {
    fn new(root: PathBuf, gzip: bool) -> Self {
        Self {
            root,
            gzip,
            path: None,
            file_path: None,
            writer: None,
            buffered: VecDeque::new(),
            disabled: false,
        }
    }

    fn handle(&mut self, message: RecorderMsg) -> anyhow::Result<()> {
        match message {
            RecorderMsg::Initial(initial) => self.initial(initial),
            update @ RecorderMsg::Update { .. } => {
                if self.writer.is_some() {
                    self.write_update(update)
                } else {
                    if self.buffered.len() == MAX_BUFFERED {
                        self.buffered.pop_front();
                    }
                    self.buffered.push_back(update);
                    Ok(())
                }
            }
            RecorderMsg::Flush => self.flush(),
        }
    }

    fn initial(&mut self, initial: Value) -> anyhow::Result<()> {
        self.disabled = false;
        let Some(path) = initial
            .pointer("/SessionInfo/Path")
            .and_then(Value::as_str)
            .map(str::to_owned)
        else {
            warn!("snapshot has no SessionInfo.Path; buffering recorder messages");
            return Ok(());
        };
        if self.path.as_deref() != Some(path.as_str()) || self.writer.is_none() {
            self.close_current()?;
            self.open(&path)?;
        }
        self.write_json(&json!({"type":3,"invocationId":"recorded-subscribe","result":initial}))?;
        while let Some(update) = self.buffered.pop_front() {
            self.write_update(update)?;
        }
        Ok(())
    }

    fn open(&mut self, session_path: &str) -> anyhow::Result<()> {
        let (year, name) = recording_name(session_path);
        let directory = self.root.join(year);
        fs::create_dir_all(&directory)?;
        let file_path = directory.join(format!("{name}.data.txt"));
        let new_file = !file_path.exists() || fs::metadata(&file_path)?.len() == 0;
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&file_path)?;
        let mut writer = BufWriter::new(file);
        if new_file {
            writeln!(writer, "{{}}\u{001e}")?;
        }
        self.path = Some(session_path.to_owned());
        self.file_path = Some(file_path);
        self.writer = Some(writer);
        Ok(())
    }

    fn write_update(&mut self, update: RecorderMsg) -> anyhow::Result<()> {
        if let RecorderMsg::Update {
            topic,
            data,
            timestamp,
        } = update
        {
            self.write_json(&json!({"type":1,"target":"feed","arguments":[topic,data,timestamp]}))?;
        }
        Ok(())
    }

    fn write_json(&mut self, value: &Value) -> anyhow::Result<()> {
        if self.disabled {
            return Ok(());
        }
        if let Some(writer) = &mut self.writer {
            writeln!(writer, "{}\u{001e}", value)?;
        }
        Ok(())
    }

    fn flush(&mut self) -> anyhow::Result<()> {
        if let Some(writer) = &mut self.writer {
            writer.flush()?;
        }
        Ok(())
    }

    fn close_current(&mut self) -> anyhow::Result<()> {
        self.flush()?;
        self.writer.take();
        self.path.take();
        if self.gzip {
            if let Some(path) = self.file_path.take()
                && path.exists()
            {
                compress_file(&path)?;
            }
        } else {
            self.file_path.take();
        }
        Ok(())
    }

    fn disable(&mut self) {
        self.writer.take();
        self.path.take();
        self.file_path.take();
        self.disabled = true;
    }
}

fn recording_name(path: &str) -> (String, String) {
    let parts: Vec<_> = path
        .split(['/', '\\'])
        .filter(|part| !part.is_empty())
        .collect();
    let year = parts
        .iter()
        .find(|part| part.len() == 4 && part.chars().all(|c| c.is_ascii_digit()))
        .copied()
        .unwrap_or("unknown");
    let meaningful = parts
        .iter()
        .skip_while(|part| **part != year)
        .skip(1)
        .copied()
        .collect::<Vec<_>>();
    let source = if meaningful.is_empty() {
        parts.as_slice()
    } else {
        meaningful.as_slice()
    };
    let sanitized = source
        .join("_")
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || matches!(c, '-' | '_') {
                c
            } else {
                '_'
            }
        })
        .collect::<String>();
    (year.to_owned(), sanitized.trim_matches('_').to_owned())
}

fn compress_file(path: &Path) -> anyhow::Result<()> {
    let gz_path = PathBuf::from(format!("{}.gz", path.display()));
    let mut input = File::open(path)?;
    let output = File::create(&gz_path)?;
    let mut encoder = GzEncoder::new(output, Compression::default());
    std::io::copy(&mut input, &mut encoder)?;
    encoder.finish()?;
    fs::remove_file(path)?;
    Ok(())
}

fn env_bool(key: &str, default: bool) -> bool {
    env::var(key)
        .ok()
        .map(|v| {
            !matches!(
                v.to_ascii_lowercase().as_str(),
                "0" | "false" | "no" | "off"
            )
        })
        .unwrap_or(default)
}

#[cfg(test)]
mod tests {
    use super::{RecorderMsg, spawn_recorder_with};
    use serde_json::json;
    use std::{fs, time::Duration};
    use tempfile::tempdir;

    #[tokio::test]
    async fn writes_replay_format_and_appends_reconnection_snapshot() {
        let dir = tempdir().unwrap();
        let recorder = spawn_recorder_with(dir.path().to_path_buf(), true, false);
        recorder.send(RecorderMsg::Initial(
            json!({"SessionInfo":{"Path":"2026/Spanish Grand Prix/Race"}}),
        ));
        recorder.send(RecorderMsg::Update {
            topic: "TimingData".into(),
            data: json!({"Lines":{}}),
            timestamp: "2026-06-11T12:00:00Z".into(),
        });
        recorder.send(RecorderMsg::Initial(
            json!({"SessionInfo":{"Path":"2026/Spanish Grand Prix/Race"},"DriverList":{}}),
        ));
        recorder.send(RecorderMsg::Flush);
        tokio::time::sleep(Duration::from_millis(50)).await;
        let text =
            fs::read_to_string(dir.path().join("2026/Spanish_Grand_Prix_Race.data.txt")).unwrap();
        let lines: Vec<_> = text.lines().collect();
        assert_eq!(lines[0], "{}\u{001e}");
        assert_eq!(
            lines
                .iter()
                .filter(|line| line.contains("recorded-subscribe"))
                .count(),
            2
        );
        assert!(lines[2].contains("2026-06-11T12:00:00Z"));
    }

    #[tokio::test]
    async fn buffers_updates_until_path_is_known_and_rotates() {
        let dir = tempdir().unwrap();
        let recorder = spawn_recorder_with(dir.path().to_path_buf(), true, false);
        recorder.send(RecorderMsg::Update {
            topic: "Heartbeat".into(),
            data: json!({"Utc":"x"}),
            timestamp: "x".into(),
        });
        recorder.send(RecorderMsg::Initial(
            json!({"SessionInfo":{"Path":"2026/A/Race"}}),
        ));
        recorder.send(RecorderMsg::Initial(
            json!({"SessionInfo":{"Path":"2026/B/Race"}}),
        ));
        recorder.send(RecorderMsg::Flush);
        tokio::time::sleep(Duration::from_millis(50)).await;
        assert!(
            fs::read_to_string(dir.path().join("2026/A_Race.data.txt"))
                .unwrap()
                .contains("Heartbeat")
        );
        assert!(dir.path().join("2026/B_Race.data.txt").exists());
    }
}
