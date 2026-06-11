pub mod db;
pub mod events;
pub mod laps;
pub mod normalize;
pub mod reader;
pub mod replayer;
pub mod telemetry;

use crate::{events::Event, laps::LapRecord, telemetry::Sample};
use chrono::DateTime;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use signalr::FrameKind;
use std::{
    collections::{HashMap, HashSet},
    path::{Path, PathBuf},
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WeatherSample {
    pub utc: String,
    pub air_temp: Option<f64>,
    pub track_temp: Option<f64>,
    pub rainfall: Option<f64>,
    pub wind_speed: Option<f64>,
    pub humidity: Option<f64>,
}
pub struct IngestedSession {
    pub source_file: PathBuf,
    pub state: Value,
    pub complete: bool,
    pub laps: HashMap<String, Vec<LapRecord>>,
    pub events: Vec<Event>,
    pub weather: Vec<WeatherSample>,
    pub telemetry: Vec<Sample>,
}

pub fn ingest_file(path: &Path) -> anyhow::Result<IngestedSession> {
    let frames = reader::frames(path)?;
    let mut replay = replayer::Replayer::default();
    let mut laps = laps::Tracker::default();
    let mut events = events::Tracker::default();
    let mut weather = vec![];
    let mut weather_minutes = HashSet::new();
    let mut compressed = vec![];
    let mut complete = false;
    for frame in frames {
        match frame.kind {
            FrameKind::Completion {
                result: Some(state),
            } => {
                replay.set(state);
                laps.reset_state(&replay.state);
            }
            FrameKind::Feed {
                topic,
                data,
                timestamp,
            } => {
                let topic = normalize::topic(&topic);
                if topic == "CarDataZ"
                    && let Some(encoded) = data.as_str()
                {
                    compressed.push(encoded.to_owned());
                }
                replay.apply(topic, data);
                laps.ingest(&replay.state, &timestamp);
                events.ingest(&replay.state, &timestamp);
                if topic == "WeatherData" {
                    let minute = timestamp.get(..16).unwrap_or(&timestamp).to_owned();
                    if weather_minutes.insert(minute) {
                        weather.push(weather_sample(&replay.state, &timestamp));
                    }
                }
                if topic == "SessionStatus" {
                    complete = replay
                        .state
                        .pointer("/SessionStatus/Status")
                        .and_then(Value::as_str)
                        .is_some_and(|s| matches!(s, "Finished" | "Finalised" | "Ends"));
                }
            }
            _ => {}
        }
    }
    let lap_ranges = lap_ranges(&laps.laps);
    let mut telemetry = vec![];
    for encoded in compressed {
        match telemetry::decode_car_data(&encoded, |nr, ts| lap_for(&lap_ranges, nr, ts)) {
            Ok(mut samples) => telemetry.append(&mut samples),
            Err(error) => tracing::warn!(?error, "discarding invalid CarData frame"),
        }
    }
    complete |= replay
        .state
        .pointer("/SessionStatus/Status")
        .and_then(Value::as_str)
        .is_some_and(|status| matches!(status, "Finished" | "Finalised" | "Ends"));
    for (driver_nr, records) in &laps.laps {
        for lap in records.iter().filter(|lap| lap.pitted) {
            events.events.push(Event {
                utc: lap.utc.clone(),
                kind: "pit".into(),
                driver_nr: Some(driver_nr.clone()),
                lap: Some(lap.lap),
                message: Some("Pit lane visit".into()),
            });
        }
    }
    Ok(IngestedSession {
        source_file: path.to_path_buf(),
        state: replay.state,
        complete,
        laps: laps.laps,
        events: events.events,
        weather,
        telemetry,
    })
}
fn number(value: Option<&Value>) -> Option<f64> {
    value.and_then(|v| v.as_f64().or_else(|| v.as_str()?.parse().ok()))
}
fn weather_sample(state: &Value, utc: &str) -> WeatherSample {
    let w = state.get("WeatherData");
    WeatherSample {
        utc: utc.into(),
        air_temp: number(w.and_then(|x| x.get("AirTemp"))),
        track_temp: number(w.and_then(|x| x.get("TrackTemp"))),
        rainfall: number(w.and_then(|x| x.get("Rainfall"))),
        wind_speed: number(w.and_then(|x| x.get("WindSpeed"))),
        humidity: number(w.and_then(|x| x.get("Humidity"))),
    }
}
fn lap_ranges(laps: &HashMap<String, Vec<LapRecord>>) -> HashMap<String, Vec<(i64, i64)>> {
    laps.iter()
        .map(|(nr, laps)| {
            (
                nr.clone(),
                laps.iter()
                    .filter_map(|l| {
                        DateTime::parse_from_rfc3339(&l.utc)
                            .ok()
                            .map(|d| (d.timestamp_millis(), l.lap))
                    })
                    .collect(),
            )
        })
        .collect()
}
fn lap_for(ranges: &HashMap<String, Vec<(i64, i64)>>, nr: &str, ts: i64) -> Option<i64> {
    let ranges = ranges.get(nr)?;
    ranges
        .iter()
        .find(|(end, _)| ts <= *end)
        .map(|(_, lap)| *lap)
        .or_else(|| ranges.last().map(|(_, lap)| lap + 1))
}
