use crate::normalize::object_values;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashSet;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    pub utc: String,
    pub kind: String,
    pub driver_nr: Option<String>,
    pub lap: Option<i64>,
    pub message: Option<String>,
}

#[derive(Default)]
pub struct Tracker {
    track_status: Option<String>,
    seen: HashSet<String>,
    pub events: Vec<Event>,
}
impl Tracker {
    pub fn ingest(&mut self, state: &Value, timestamp: &str) {
        if let Some(status) = state.pointer("/TrackStatus/Status").and_then(Value::as_str)
            && self.track_status.as_deref() != Some(status)
        {
            self.track_status = Some(status.into());
            self.events.push(Event {
                utc: timestamp.into(),
                kind: track_kind(status).into(),
                driver_nr: None,
                lap: None,
                message: state
                    .pointer("/TrackStatus/Message")
                    .and_then(Value::as_str)
                    .map(str::to_owned),
            });
        }
        for msg in object_values(state.pointer("/RaceControlMessages/Messages")) {
            let key = msg.to_string();
            if self.seen.insert(key) {
                let text = msg.get("Message").and_then(Value::as_str).unwrap_or("");
                let lower = text.to_ascii_lowercase();
                let kind = if lower.contains("track limit") {
                    "track-limits"
                } else if lower.contains("penalty") || lower.contains("investigat") {
                    "penalty"
                } else if lower.contains("chequer") {
                    "chequered"
                } else {
                    "race-control"
                };
                self.events.push(Event {
                    utc: msg
                        .get("Utc")
                        .and_then(Value::as_str)
                        .unwrap_or(timestamp)
                        .into(),
                    kind: kind.into(),
                    driver_nr: msg
                        .get("RacingNumber")
                        .and_then(Value::as_str)
                        .map(str::to_owned),
                    lap: msg.get("Lap").and_then(Value::as_i64),
                    message: Some(text.into()),
                });
            }
        }
    }
}
fn track_kind(status: &str) -> &str {
    match status {
        "1" => "green",
        "2" => "yellow",
        "4" => "sc",
        "5" => "red",
        "6" | "7" => "vsc",
        _ => "track-status",
    }
}
