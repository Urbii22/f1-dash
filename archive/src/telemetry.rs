use base64::Engine;
use flate2::read::DeflateDecoder;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::Read;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Sample {
    pub driver_nr: String,
    pub ts_ms: i64,
    pub lap: Option<i64>,
    pub speed: Option<i64>,
    pub rpm: Option<i64>,
    pub gear: Option<i64>,
    pub throttle: Option<i64>,
    pub brake: Option<i64>,
}

pub fn decode_car_data(
    encoded: &str,
    lap_for: impl Fn(&str, i64) -> Option<i64>,
) -> anyhow::Result<Vec<Sample>> {
    let bytes = base64::engine::general_purpose::STANDARD.decode(encoded)?;
    let mut text = String::new();
    DeflateDecoder::new(bytes.as_slice()).read_to_string(&mut text)?;
    let root: Value = serde_json::from_str(&text)?;
    let mut out = vec![];
    for entry in root
        .get("Entries")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        let utc = entry.get("Utc").and_then(Value::as_str).unwrap_or("");
        let ts = chrono::DateTime::parse_from_rfc3339(utc)
            .map(|d| d.timestamp_millis())
            .unwrap_or(0);
        if let Some(cars) = entry.get("Cars").and_then(Value::as_object) {
            for (nr, car) in cars {
                let ch = car.get("Channels").and_then(Value::as_object);
                let v = |key: &str| {
                    ch.and_then(|c| c.get(key))
                        .and_then(|x| x.as_i64().or_else(|| x.as_str()?.parse().ok()))
                };
                out.push(Sample {
                    driver_nr: nr.clone(),
                    ts_ms: ts,
                    lap: lap_for(nr, ts),
                    rpm: v("0"),
                    speed: v("2"),
                    gear: v("3"),
                    throttle: v("4"),
                    brake: v("5"),
                });
            }
        }
    }
    Ok(out)
}
