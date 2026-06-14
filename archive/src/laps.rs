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
    pub speed_trap_kph: Option<i64>,
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

/// Last observed per-driver fields needed for edge detection. Tracking only
/// these (instead of cloning the whole merged state every frame) keeps a full
/// race ingest at a few MB of allocations instead of gigabytes.
#[derive(Clone, Default)]
struct PrevLine {
    laps: Option<i64>,
    last_lap_time: Option<String>,
}

#[derive(Default)]
pub struct Tracker {
    prev: HashMap<String, PrevLine>,
    pit_flags: HashMap<String, bool>,
    // last positive speed-trap (ST) seen since the driver's previous lap flank;
    // the feed clears Speeds.ST at lap start, so it is gone by the time the lap
    // closes — we latch it during the lap and attach it when the lap completes.
    last_trap: HashMap<String, i64>,
    session_path: Option<String>,
    pub laps: HashMap<String, Vec<LapRecord>>,
}

impl Tracker {
    pub fn reset_state(&mut self, state: &Value) {
        self.prev.clear();
        self.pit_flags.clear();
        self.last_trap.clear();
        self.remember_lines(state);
        self.session_path = state
            .pointer("/SessionInfo/Path")
            .and_then(Value::as_str)
            .map(str::to_owned);
    }

    fn remember_lines(&mut self, state: &Value) {
        if let Some(lines) = state
            .pointer("/TimingData/Lines")
            .and_then(Value::as_object)
        {
            for (nr, line) in lines {
                self.prev.insert(
                    nr.clone(),
                    PrevLine {
                        laps: line.get("NumberOfLaps").and_then(Value::as_i64),
                        last_lap_time: line
                            .pointer("/LastLapTime/Value")
                            .and_then(Value::as_str)
                            .map(str::to_owned),
                    },
                );
            }
        }
    }

    pub fn ingest(&mut self, state: &Value, timestamp: &str) {
        let path = state.pointer("/SessionInfo/Path").and_then(Value::as_str);
        if self
            .session_path
            .as_deref()
            .is_some_and(|old| path.is_some_and(|new| old != new))
        {
            self.prev.clear();
            self.pit_flags.clear();
            self.last_trap.clear();
        }
        if let Some(path) = path {
            self.session_path = Some(path.to_owned());
        }
        let Some(lines) = state
            .pointer("/TimingData/Lines")
            .and_then(Value::as_object)
        else {
            return;
        };
        for (nr, line) in lines {
            if truthy(line.get("InPit")) || truthy(line.get("PitOut")) {
                self.pit_flags.insert(nr.clone(), true);
            }
            // latch the speed trap as soon as it appears; it is cleared before the flank
            if let Some(kph) = speed_trap(line) {
                self.last_trap.insert(nr.clone(), kph);
            }

            let lap = line.get("NumberOfLaps").and_then(Value::as_i64);
            let last = line.pointer("/LastLapTime/Value").and_then(Value::as_str);

            let Some(prev_line) = self.prev.get(nr) else {
                // first observation of this driver: remember, never record
                self.prev.insert(
                    nr.clone(),
                    PrevLine {
                        laps: lap,
                        last_lap_time: last.map(str::to_owned),
                    },
                );
                continue;
            };

            let flank = match (lap, prev_line.laps) {
                (Some(lap), Some(prev_laps)) => lap > prev_laps,
                _ => false,
            };

            if flank
                && let Some(lap) = lap
                && !truthy(line.get("Retired"))
                && !truthy(line.get("Stopped"))
            {
                let lap_time_changed = last != prev_line.last_lap_time.as_deref();
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
                    lap_time_ms: if lap_time_changed {
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
                    // the latched trap belongs to the lap that just closed; take it and re-arm
                    speed_trap_kph: self.last_trap.remove(nr).or_else(|| speed_trap(line)),
                    utc: timestamp.to_owned(),
                };
                self.laps.entry(nr.clone()).or_default().push(record);
                // the flag covered the lap that just closed; re-arm for the out lap
                self.pit_flags.insert(
                    nr.clone(),
                    truthy(line.get("InPit")) || truthy(line.get("PitOut")),
                );
            }

            let entry = self.prev.entry(nr.clone()).or_default();
            if lap.is_some() {
                entry.laps = lap;
            }
            if let Some(last) = last {
                entry.last_lap_time = Some(last.to_owned());
            }
        }
    }
}

fn truthy(value: Option<&Value>) -> bool {
    value.and_then(Value::as_bool).unwrap_or(false)
}
fn value_i64(value: &Value) -> Option<i64> {
    value.as_i64().or_else(|| value.as_str()?.parse().ok())
}
fn speed_trap(line: &Value) -> Option<i64> {
    // F1 feed keys the speed trap as "ST" (upper case) under Speeds.
    line.pointer("/Speeds/ST/Value")
        .and_then(value_i64)
        .filter(|&kph| kph > 0)
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
    // median matching lib/lapHistory.ts: average the two middle values on even counts
    let mid = times.len() / 2;
    let median = if times.len() % 2 == 0 {
        (times[mid - 1] + times[mid]) as f64 / 2.0
    } else {
        times[mid] as f64
    };
    laps.iter()
        .filter(|lap| !lap.pitted && lap.lap_time_ms.is_some_and(|t| (t as f64) < median + 5000.0))
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
    use serde_json::json;

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
            speed_trap_kph: None,
            utc: "x".into(),
        }
    }

    fn state(lines: Value) -> Value {
        json!({"TimingData": {"Lines": lines}})
    }

    fn line(laps: i64, last: &str, extra: Value) -> Value {
        let mut base = json!({"NumberOfLaps": laps, "LastLapTime": {"Value": last}, "Position": "1"});
        merge_json(&mut base, extra);
        base
    }

    fn merge_json(base: &mut Value, update: Value) {
        if let (Value::Object(base), Value::Object(update)) = (base, update) {
            for (k, v) in update {
                base.insert(k, v);
            }
        }
    }

    // port of lapHistory.test.ts: "records a lap when NumberOfLaps increases..."
    #[test]
    fn records_lap_on_flank_with_changed_time() {
        let mut tracker = Tracker::default();
        tracker.ingest(&state(json!({"1": line(4, "1:24.000", json!({}))})), "t0");
        tracker.ingest(
            &state(json!({"1": line(5, "1:23.456", json!({"Position": "3", "GapToLeader": "+2.000"}))})),
            "t1",
        );

        let laps = &tracker.laps["1"];
        assert_eq!(laps.len(), 1);
        assert_eq!(laps[0].lap, 5);
        assert_eq!(laps[0].lap_time_ms, Some(83_456));
        assert_eq!(laps[0].position, Some(3));
        assert_eq!(laps[0].gap_to_leader_ms, Some(2_000));
        assert_eq!(laps[0].utc, "t1");
    }

    // "does not record anything without a lap flank"
    #[test]
    fn no_record_without_flank() {
        let mut tracker = Tracker::default();
        tracker.ingest(&state(json!({"1": line(5, "", json!({}))})), "t0");
        tracker.ingest(&state(json!({"1": line(5, "1:23.456", json!({}))})), "t1");
        assert!(tracker.laps.is_empty());
    }

    // "nulls the lap time when LastLapTime did not change with the flank"
    #[test]
    fn frozen_lap_time_records_null() {
        let mut tracker = Tracker::default();
        tracker.ingest(&state(json!({"1": line(4, "1:24.000", json!({}))})), "t0");
        tracker.ingest(&state(json!({"1": line(5, "1:24.000", json!({}))})), "t1");
        assert_eq!(tracker.laps["1"][0].lap_time_ms, None);
    }

    // "skips retired and stopped drivers"
    #[test]
    fn skips_retired_drivers() {
        let mut tracker = Tracker::default();
        tracker.ingest(&state(json!({"1": line(4, "", json!({}))})), "t0");
        tracker.ingest(
            &state(json!({"1": line(5, "1:24.0", json!({"Retired": true}))})),
            "t1",
        );
        assert!(tracker.laps.is_empty());
    }

    // "treats lapped drivers' gap as null"
    #[test]
    fn lapped_gap_is_null() {
        let mut tracker = Tracker::default();
        tracker.ingest(&state(json!({"1": line(4, "", json!({}))})), "t0");
        tracker.ingest(
            &state(json!({"1": line(5, "1:30.0", json!({"Position": "18", "GapToLeader": "1L"}))})),
            "t1",
        );
        assert_eq!(tracker.laps["1"][0].gap_to_leader_ms, None);
    }

    // "reads compound and tyre age from TimingAppData"
    #[test]
    fn reads_stint_from_timing_app_data() {
        let mut tracker = Tracker::default();
        tracker.ingest(&state(json!({"1": line(4, "", json!({}))})), "t0");
        let mut with_stints = state(json!({"1": line(5, "1:30.0", json!({}))}));
        merge_json(
            &mut with_stints,
            json!({"TimingAppData": {"Lines": {"1": {"Stints": [
                {"Compound": "SOFT", "TotalLaps": 12},
                {"Compound": "MEDIUM", "TotalLaps": 3}
            ]}}}}),
        );
        tracker.ingest(&with_stints, "t1");
        assert_eq!(tracker.laps["1"][0].compound.as_deref(), Some("MEDIUM"));
        assert_eq!(tracker.laps["1"][0].tyre_age, Some(3));
    }

    // reads the speed trap (Speeds.St.Value) on the lap flank, ignoring 0/absent
    #[test]
    fn reads_speed_trap_on_flank() {
        let mut tracker = Tracker::default();
        tracker.ingest(&state(json!({"1": line(4, "", json!({}))})), "t0");
        tracker.ingest(
            &state(json!({"1": line(5, "1:24.0", json!({"Speeds": {"ST": {"Value": "318"}}}))})),
            "t1",
        );
        assert_eq!(tracker.laps["1"][0].speed_trap_kph, Some(318));

        // a 0/absent reading must record None, not 0
        tracker.ingest(
            &state(json!({"1": line(6, "1:25.0", json!({"Speeds": {"ST": {"Value": "0"}}}))})),
            "t2",
        );
        assert_eq!(tracker.laps["1"][1].speed_trap_kph, None);
    }

    // latches the trap seen mid-lap and attaches it when the lap closes without ST
    #[test]
    fn latches_speed_trap_across_lap() {
        let mut tracker = Tracker::default();
        tracker.ingest(&state(json!({"1": line(4, "", json!({}))})), "t0");
        // trap appears mid-lap (no flank yet)
        tracker.ingest(
            &state(json!({"1": line(4, "", json!({"Speeds": {"ST": {"Value": "330"}}}))})),
            "t1",
        );
        // lap closes; ST already cleared by the feed
        tracker.ingest(
            &state(json!({"1": line(5, "1:24.0", json!({"Speeds": {"ST": {"Value": ""}}}))})),
            "t2",
        );
        assert_eq!(tracker.laps["1"][0].speed_trap_kph, Some(330));
    }

    // tracker test: "marks laps as pitted when the driver visited the pit lane"
    #[test]
    fn marks_pit_laps_and_rearms() {
        let mut tracker = Tracker::default();
        tracker.ingest(&state(json!({"1": line(4, "", json!({}))})), "t0");
        tracker.ingest(&state(json!({"1": line(4, "", json!({"InPit": true}))})), "t1");
        tracker.ingest(&state(json!({"1": line(5, "1:40.0", json!({}))})), "t2");
        tracker.ingest(&state(json!({"1": line(6, "1:24.0", json!({}))})), "t3");

        let laps = &tracker.laps["1"];
        assert!(laps[0].pitted);
        assert!(!laps[1].pitted);
    }

    // tracker test: "never emits on the first observation"
    #[test]
    fn first_observation_never_emits() {
        let mut tracker = Tracker::default();
        tracker.ingest(&state(json!({"1": line(10, "1:24.0", json!({}))})), "t0");
        assert!(tracker.laps.is_empty());
    }

    // session change clears edge state but keeps already-recorded laps
    #[test]
    fn session_change_resets_edges() {
        let mut tracker = Tracker::default();
        let mut a = state(json!({"1": line(4, "", json!({}))}));
        merge_json(&mut a, json!({"SessionInfo": {"Path": "2026/race-a/"}}));
        let mut b = state(json!({"1": line(1, "", json!({}))}));
        merge_json(&mut b, json!({"SessionInfo": {"Path": "2026/race-b/"}}));

        tracker.ingest(&a, "t0");
        tracker.ingest(&b, "t1");
        // no flank across the session boundary, and first observation of the new session
        assert!(tracker.laps.is_empty());
    }

    // snapshot reset arms the detector so the next flank is caught
    #[test]
    fn snapshot_reset_arms_detector() {
        let mut tracker = Tracker::default();
        tracker.reset_state(&state(json!({"1": line(12, "1:25.0", json!({}))})));
        tracker.ingest(&state(json!({"1": line(13, "1:24.5", json!({}))})), "t1");
        assert_eq!(tracker.laps["1"][0].lap, 13);
        assert_eq!(tracker.laps["1"][0].lap_time_ms, Some(84_500));
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

    // port of "splits stints on compound change and tyre age reset"
    #[test]
    fn splits_stints_on_compound_and_age_reset() {
        let mk = |n: i64, t: i64, compound: &str, age: i64, pitted: bool| LapRecord {
            compound: Some(compound.into()),
            tyre_age: Some(age),
            pitted,
            ..lap(n, Some(t))
        };
        let stints = build_stints(&[
            mk(1, 84000, "SOFT", 1, false),
            mk(2, 84200, "SOFT", 2, false),
            mk(3, 84400, "SOFT", 3, true),
            mk(4, 86000, "MEDIUM", 1, true),
            mk(5, 84800, "MEDIUM", 2, false),
            mk(6, 84900, "MEDIUM", 3, false),
        ]);
        assert_eq!(stints.len(), 2);
        assert_eq!(
            (stints[0].start_lap, stints[0].end_lap, stints[0].lap_count),
            (1, 3, 3)
        );
        assert_eq!(stints[1].compound.as_deref(), Some("MEDIUM"));
    }

    // port of cleanLaps: "filters pit laps, missing times and outliers" (even-count median)
    #[test]
    fn clean_laps_filters_outliers_with_averaged_median() {
        let mut outlier = lap(4, Some(110_000));
        outlier.tyre_age = Some(4);
        let mut pit = lap(5, Some(84_200));
        pit.pitted = true;
        let laps = vec![
            lap(1, Some(84_000)),
            lap(2, Some(84_100)),
            lap(3, None),
            outlier,
            pit,
            lap(6, Some(84_300)),
        ];
        let clean = clean_laps(&laps);
        assert_eq!(clean.iter().map(|l| l.lap).collect::<Vec<_>>(), vec![1, 2, 6]);
    }
}
