use crate::normalize::{object_values, parse_time_ms};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LapRecord {
    pub lap: i64,
    pub lap_time_ms: Option<i64>,
    pub sectors_ms: [Option<i64>; 3],
    pub position: Option<i64>,
    pub gap_to_leader_ms: Option<i64>,
    pub compound: Option<String>,
    pub tyre_age: Option<i64>,
    pub pitted: bool,
    pub utc: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StintRecord {
    pub stint: i64,
    pub compound: Option<String>,
    pub start_lap: i64,
    pub end_lap: i64,
    pub lap_count: i64,
    pub best_ms: Option<i64>,
    pub avg_ms: Option<f64>,
    pub deg_ms_per_lap: Option<f64>,
}

#[derive(Default)]
pub struct Tracker {
    prev: Option<Value>,
    pit_flags: HashMap<String, bool>,
    session_path: Option<String>,
    pub laps: HashMap<String, Vec<LapRecord>>,
}

impl Tracker {
    pub fn reset_state(&mut self, state: &Value) {
        self.prev = Some(state.clone());
        self.pit_flags.clear();
        self.session_path = state
            .pointer("/SessionInfo/Path")
            .and_then(Value::as_str)
            .map(str::to_owned);
    }
    pub fn ingest(&mut self, state: &Value, timestamp: &str) {
        let path = state.pointer("/SessionInfo/Path").and_then(Value::as_str);
        if self
            .session_path
            .as_deref()
            .is_some_and(|old| path.is_some_and(|new| old != new))
        {
            self.prev = None;
            self.pit_flags.clear();
        }
        if let Some(path) = path {
            self.session_path = Some(path.to_owned());
        }
        if let Some(lines) = state
            .pointer("/TimingData/Lines")
            .and_then(Value::as_object)
        {
            for (nr, line) in lines {
                if truthy(line.get("InPit")) || truthy(line.get("PitOut")) {
                    self.pit_flags.insert(nr.clone(), true);
                }
            }
        }
        let Some(prev) = &self.prev else {
            self.prev = Some(state.clone());
            return;
        };
        let Some(lines) = state
            .pointer("/TimingData/Lines")
            .and_then(Value::as_object)
        else {
            self.prev = Some(state.clone());
            return;
        };
        let prev_lines = prev.pointer("/TimingData/Lines").and_then(Value::as_object);
        for (nr, line) in lines {
            let Some(prev_line) = prev_lines.and_then(|lines| lines.get(nr)) else {
                continue;
            };
            let Some(lap) = line.get("NumberOfLaps").and_then(Value::as_i64) else {
                continue;
            };
            if lap
                <= prev_line
                    .get("NumberOfLaps")
                    .and_then(Value::as_i64)
                    .unwrap_or(lap)
                || truthy(line.get("Retired"))
                || truthy(line.get("Stopped"))
            {
                continue;
            }
            let last = line.pointer("/LastLapTime/Value").and_then(Value::as_str);
            let prev_last = prev_line
                .pointer("/LastLapTime/Value")
                .and_then(Value::as_str);
            let stint = current_stint(state, nr);
            let position = line.get("Position").and_then(value_i64);
            let gap = if position == Some(1) {
                Some(0)
            } else {
                line.get("GapToLeader")
                    .and_then(Value::as_str)
                    .filter(|v| !v.to_ascii_uppercase().contains('L'))
                    .and_then(|v| parse_time_ms(Some(v)))
            };
            let record = LapRecord {
                lap,
                lap_time_ms: if last != prev_last {
                    parse_time_ms(last)
                } else {
                    None
                },
                sectors_ms: [sector(line, 0), sector(line, 1), sector(line, 2)],
                position,
                gap_to_leader_ms: gap,
                compound: stint
                    .and_then(|x| x.get("Compound"))
                    .and_then(Value::as_str)
                    .map(str::to_owned),
                tyre_age: stint.and_then(|x| x.get("TotalLaps")).and_then(value_i64),
                pitted: self.pit_flags.get(nr).copied().unwrap_or(false),
                utc: timestamp.to_owned(),
            };
            self.laps.entry(nr.clone()).or_default().push(record);
            self.pit_flags.insert(
                nr.clone(),
                truthy(line.get("InPit")) || truthy(line.get("PitOut")),
            );
        }
        self.prev = Some(state.clone());
    }
}

fn truthy(value: Option<&Value>) -> bool {
    value.and_then(Value::as_bool).unwrap_or(false)
}
fn value_i64(value: &Value) -> Option<i64> {
    value.as_i64().or_else(|| value.as_str()?.parse().ok())
}
fn sector(line: &Value, index: usize) -> Option<i64> {
    object_values(line.get("Sectors"))
        .get(index)
        .and_then(|s| s.pointer("/Value"))
        .and_then(Value::as_str)
        .and_then(|v| parse_time_ms(Some(v)))
}
fn current_stint<'a>(state: &'a Value, nr: &str) -> Option<&'a Value> {
    object_values(state.pointer(&format!("/TimingAppData/Lines/{nr}/Stints")))
        .last()
        .copied()
}

pub fn build_stints(laps: &[LapRecord]) -> Vec<StintRecord> {
    if laps.is_empty() {
        return vec![];
    }
    let mut groups: Vec<Vec<LapRecord>> = Vec::new();
    let mut current = Vec::new();
    for lap in laps {
        let split = current.last().is_some_and(|last: &LapRecord| {
            (lap.tyre_age.is_some() && last.tyre_age.is_some() && lap.tyre_age < last.tyre_age)
                || (lap.compound.is_some()
                    && last.compound.is_some()
                    && lap.compound != last.compound)
        });
        if split {
            groups.push(std::mem::take(&mut current));
        }
        current.push(lap.clone());
    }
    if !current.is_empty() {
        groups.push(current);
    }
    groups
        .into_iter()
        .enumerate()
        .map(|(index, group)| {
            let clean = clean_laps(&group);
            let times: Vec<i64> = clean.iter().filter_map(|lap| lap.lap_time_ms).collect();
            StintRecord {
                stint: index as i64 + 1,
                compound: group.iter().find_map(|lap| lap.compound.clone()),
                start_lap: group[0].lap,
                end_lap: group.last().unwrap().lap,
                lap_count: group.len() as i64,
                best_ms: times.iter().min().copied(),
                avg_ms: (!times.is_empty())
                    .then(|| times.iter().sum::<i64>() as f64 / times.len() as f64),
                deg_ms_per_lap: slope(&clean),
            }
        })
        .collect()
}

fn clean_laps(laps: &[LapRecord]) -> Vec<LapRecord> {
    let mut times: Vec<i64> = laps
        .iter()
        .filter(|lap| !lap.pitted)
        .filter_map(|lap| lap.lap_time_ms)
        .collect();
    if times.is_empty() {
        return vec![];
    }
    times.sort();
    let median = times[times.len() / 2];
    laps.iter()
        .filter(|lap| !lap.pitted && lap.lap_time_ms.is_some_and(|t| t < median + 5000))
        .cloned()
        .collect()
}
fn slope(laps: &[LapRecord]) -> Option<f64> {
    if laps.len() < 3 {
        return None;
    }
    let n = laps.len() as f64;
    let sx = laps.iter().map(|l| l.lap as f64).sum::<f64>();
    let sy = laps
        .iter()
        .map(|l| l.lap_time_ms.unwrap() as f64)
        .sum::<f64>();
    let sxy = laps
        .iter()
        .map(|l| l.lap as f64 * l.lap_time_ms.unwrap() as f64)
        .sum::<f64>();
    let sxx = laps.iter().map(|l| (l.lap * l.lap) as f64).sum::<f64>();
    let d = n * sxx - sx * sx;
    (d != 0.0).then(|| (n * sxy - sx * sy) / d)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn lap(n: i64, t: Option<i64>) -> LapRecord {
        LapRecord {
            lap: n,
            lap_time_ms: t,
            sectors_ms: [None; 3],
            position: Some(1),
            gap_to_leader_ms: Some(0),
            compound: Some("SOFT".into()),
            tyre_age: Some(n),
            pitted: false,
            utc: "x".into(),
        }
    }
    #[test]
    fn builds_stint_metrics() {
        let s = build_stints(&[
            lap(1, Some(84000)),
            lap(2, Some(84100)),
            lap(3, Some(84200)),
        ]);
        assert_eq!(s[0].best_ms, Some(84000));
        assert_eq!(s[0].deg_ms_per_lap, Some(100.0));
    }
}
