//! Read-only proxy to the Jolpica-F1 API (the maintained Ergast successor) for
//! between-event data: championship standings, past results, schedules and
//! per-driver season results.
//!
//! Everything goes through a disk-cached fetch so we never hammer Jolpica (it
//! rate-limits unauthenticated clients) and stay fast offline. Responses are
//! normalised from the verbose `MRData` envelope into flat camelCase shapes so
//! the dashboard never has to know about Ergast quirks.

use std::time::Duration;

use axum::{Json, extract::Query, http::StatusCode};
use cached::proc_macro::io_cached;
use chrono::Datelike;
use serde::Deserialize;
use serde_json::{Value, json};

const BASE: &str = "https://api.jolpi.ca/ergast/f1";

#[derive(Deserialize)]
pub struct SeasonQuery {
    season: Option<i32>,
}
#[derive(Deserialize)]
pub struct RoundQuery {
    season: Option<i32>,
    round: i32,
}
#[derive(Deserialize)]
pub struct DriverQuery {
    season: Option<i32>,
}

fn current_year() -> i32 {
    chrono::Utc::now().year()
}

type ApiResult = Result<Json<Value>, StatusCode>;

/// Fetch + cache one Jolpica path (relative to BASE, without the `.json` suffix).
/// Cached on disk for an hour, keyed by the path; plenty for standings/results
/// that change at most once per session, and immutable for past seasons.
#[io_cached(
    map_error = r##"|e| anyhow::anyhow!(format!("jolpica cache error {:?}", e))"##,
    disk = true,
    time = 3600
)]
async fn cached_get(path: String) -> Result<Value, anyhow::Error> {
    let url = format!("{BASE}{path}.json?limit=100");
    let body = reqwest::get(&url).await?.error_for_status()?.json().await?;
    Ok(body)
}

async fn proxy(path: String, normalize: fn(&Value) -> Value) -> ApiResult {
    match cached_get(path).await {
        Ok(raw) => Ok(Json(normalize(&raw))),
        Err(error) => {
            tracing::error!(?error, "jolpica fetch failed");
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

// --- small Value helpers (tolerant of Ergast's all-strings numbers) -----------

fn s(value: &Value, key: &str) -> Option<String> {
    value.get(key).and_then(Value::as_str).map(str::to_owned)
}
fn num(value: &Value, key: &str) -> Option<f64> {
    value
        .get(key)
        .and_then(|v| v.as_f64().or_else(|| v.as_str()?.parse().ok()))
}
fn int(value: &Value, key: &str) -> Option<i64> {
    num(value, key).map(|n| n as i64)
}
fn first_list<'a>(root: &'a Value, table: &str, list: &str) -> &'a [Value] {
    root.pointer(&format!("/MRData/{table}"))
        .and_then(|t| t.get(list))
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or(&[])
}

fn driver_name(driver: &Value) -> Value {
    json!({
        "driverId": s(driver, "driverId"),
        "code": s(driver, "code"),
        "permanentNumber": s(driver, "permanentNumber"),
        "givenName": s(driver, "givenName"),
        "familyName": s(driver, "familyName"),
        "nationality": s(driver, "nationality"),
    })
}

// --- normalizers (pure; unit-tested against fixtures) -------------------------

fn norm_driver_standings(root: &Value) -> Value {
    let lists = first_list(root, "StandingsTable", "StandingsLists");
    let season = lists.first().and_then(|l| s(l, "season"));
    let round = lists.first().and_then(|l| s(l, "round"));
    let rows: Vec<Value> = lists
        .first()
        .and_then(|l| l.get("DriverStandings"))
        .and_then(Value::as_array)
        .map(|arr| {
            arr.iter()
                .map(|row| {
                    let driver = row.get("Driver").cloned().unwrap_or(Value::Null);
                    let constructor = row
                        .get("Constructors")
                        .and_then(Value::as_array)
                        .and_then(|c| c.last());
                    json!({
                        "position": int(row, "position"),
                        "points": num(row, "points"),
                        "wins": int(row, "wins"),
                        "driver": driver_name(&driver),
                        "constructorId": constructor.and_then(|c| s(c, "constructorId")),
                        "constructor": constructor.and_then(|c| s(c, "name")),
                    })
                })
                .collect()
        })
        .unwrap_or_default();
    json!({ "season": season, "round": round, "standings": rows })
}

fn norm_constructor_standings(root: &Value) -> Value {
    let lists = first_list(root, "StandingsTable", "StandingsLists");
    let season = lists.first().and_then(|l| s(l, "season"));
    let round = lists.first().and_then(|l| s(l, "round"));
    let rows: Vec<Value> = lists
        .first()
        .and_then(|l| l.get("ConstructorStandings"))
        .and_then(Value::as_array)
        .map(|arr| {
            arr.iter()
                .map(|row| {
                    let c = row.get("Constructor").cloned().unwrap_or(Value::Null);
                    json!({
                        "position": int(row, "position"),
                        "points": num(row, "points"),
                        "wins": int(row, "wins"),
                        "constructorId": s(&c, "constructorId"),
                        "name": s(&c, "name"),
                        "nationality": s(&c, "nationality"),
                    })
                })
                .collect()
        })
        .unwrap_or_default();
    json!({ "season": season, "round": round, "standings": rows })
}

fn race_meta(race: &Value) -> Value {
    let circuit = race.get("Circuit").cloned().unwrap_or(Value::Null);
    json!({
        "season": s(race, "season"),
        "round": int(race, "round"),
        "raceName": s(race, "raceName"),
        "date": s(race, "date"),
        "time": s(race, "time"),
        "circuitName": s(&circuit, "circuitName"),
        "country": circuit.pointer("/Location/country").and_then(Value::as_str),
        "locality": circuit.pointer("/Location/locality").and_then(Value::as_str),
    })
}

fn norm_season(root: &Value) -> Value {
    let races: Vec<Value> = first_list(root, "RaceTable", "Races")
        .iter()
        .map(race_meta)
        .collect();
    json!({ "rounds": races })
}

fn norm_results(root: &Value) -> Value {
    let races = first_list(root, "RaceTable", "Races");
    let Some(race) = races.first() else {
        return json!(null);
    };
    let results: Vec<Value> = race
        .get("Results")
        .and_then(Value::as_array)
        .map(|arr| {
            arr.iter()
                .map(|r| {
                    let driver = r.get("Driver").cloned().unwrap_or(Value::Null);
                    let fl = r.get("FastestLap");
                    json!({
                        "position": int(r, "position"),
                        "points": num(r, "points"),
                        "grid": int(r, "grid"),
                        "laps": int(r, "laps"),
                        "status": s(r, "status"),
                        "time": r.pointer("/Time/time").and_then(Value::as_str),
                        "driver": driver_name(&driver),
                        "constructor": r.pointer("/Constructor/name").and_then(Value::as_str),
                        "fastestLapRank": fl.and_then(|f| s(f, "rank")),
                        "fastestLapTime": fl.and_then(|f| f.pointer("/Time/time")).and_then(Value::as_str),
                    })
                })
                .collect()
        })
        .unwrap_or_default();
    let mut meta = race_meta(race);
    meta["results"] = Value::Array(results);
    meta
}

fn norm_qualifying(root: &Value) -> Value {
    let races = first_list(root, "RaceTable", "Races");
    let Some(race) = races.first() else {
        return json!(null);
    };
    let results: Vec<Value> = race
        .get("QualifyingResults")
        .and_then(Value::as_array)
        .map(|arr| {
            arr.iter()
                .map(|r| {
                    let driver = r.get("Driver").cloned().unwrap_or(Value::Null);
                    json!({
                        "position": int(r, "position"),
                        "driver": driver_name(&driver),
                        "constructor": r.pointer("/Constructor/name").and_then(Value::as_str),
                        "q1": s(r, "Q1"),
                        "q2": s(r, "Q2"),
                        "q3": s(r, "Q3"),
                    })
                })
                .collect()
        })
        .unwrap_or_default();
    let mut meta = race_meta(race);
    meta["results"] = Value::Array(results);
    meta
}

fn norm_driver_season(root: &Value) -> Value {
    let rounds: Vec<Value> = first_list(root, "RaceTable", "Races")
        .iter()
        .map(|race| {
            let result = race
                .get("Results")
                .and_then(Value::as_array)
                .and_then(|a| a.first());
            json!({
                "round": int(race, "round"),
                "raceName": s(race, "raceName"),
                "position": result.and_then(|r| int(r, "position")),
                "points": result.and_then(|r| num(r, "points")),
                "grid": result.and_then(|r| int(r, "grid")),
                "status": result.and_then(|r| s(r, "status")),
            })
        })
        .collect();
    json!({ "rounds": rounds })
}

// --- handlers ----------------------------------------------------------------

pub async fn driver_standings(Query(q): Query<SeasonQuery>) -> ApiResult {
    let season = q.season.unwrap_or_else(current_year);
    proxy(format!("/{season}/driverStandings"), norm_driver_standings).await
}

pub async fn constructor_standings(Query(q): Query<SeasonQuery>) -> ApiResult {
    let season = q.season.unwrap_or_else(current_year);
    proxy(
        format!("/{season}/constructorStandings"),
        norm_constructor_standings,
    )
    .await
}

pub async fn season(Query(q): Query<SeasonQuery>) -> ApiResult {
    let season = q.season.unwrap_or_else(current_year);
    proxy(format!("/{season}"), norm_season).await
}

pub async fn results(Query(q): Query<RoundQuery>) -> ApiResult {
    let season = q.season.unwrap_or_else(current_year);
    proxy(format!("/{season}/{}/results", q.round), norm_results).await
}

pub async fn qualifying(Query(q): Query<RoundQuery>) -> ApiResult {
    let season = q.season.unwrap_or_else(current_year);
    proxy(
        format!("/{season}/{}/qualifying", q.round),
        norm_qualifying,
    )
    .await
}

pub async fn driver_season(
    axum::extract::Path(driver_id): axum::extract::Path<String>,
    Query(q): Query<DriverQuery>,
) -> ApiResult {
    let season = q.season.unwrap_or_else(current_year);
    proxy(
        format!("/{season}/drivers/{driver_id}/results"),
        norm_driver_season,
    )
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_driver_standings() {
        let raw = json!({"MRData":{"StandingsTable":{"StandingsLists":[{
            "season":"2026","round":"9","DriverStandings":[
                {"position":"1","points":"180","wins":"4",
                 "Driver":{"driverId":"verstappen","code":"VER","givenName":"Max","familyName":"Verstappen"},
                 "Constructors":[{"constructorId":"red_bull","name":"Red Bull"}]}
            ]}]}}});
        let out = norm_driver_standings(&raw);
        assert_eq!(out["season"], "2026");
        let row = &out["standings"][0];
        assert_eq!(row["position"], 1);
        assert_eq!(row["points"], 180.0);
        assert_eq!(row["wins"], 4);
        assert_eq!(row["driver"]["code"], "VER");
        assert_eq!(row["constructor"], "Red Bull");
    }

    #[test]
    fn normalizes_constructor_standings() {
        let raw = json!({"MRData":{"StandingsTable":{"StandingsLists":[{
            "season":"2026","ConstructorStandings":[
                {"position":"1","points":"300","wins":"5",
                 "Constructor":{"constructorId":"mclaren","name":"McLaren","nationality":"British"}}
            ]}]}}});
        let row = &norm_constructor_standings(&raw)["standings"][0];
        assert_eq!(row["name"], "McLaren");
        assert_eq!(row["points"], 300.0);
        assert_eq!(row["position"], 1);
    }

    #[test]
    fn normalizes_results_with_fastest_lap() {
        let raw = json!({"MRData":{"RaceTable":{"Races":[{
            "season":"2026","round":"9","raceName":"Spanish Grand Prix",
            "Circuit":{"circuitName":"Catalunya","Location":{"country":"Spain","locality":"Barcelona"}},
            "date":"2026-06-14",
            "Results":[{"position":"1","points":"25","grid":"2","laps":"66","status":"Finished",
                "Time":{"time":"1:32:00.0"},
                "Driver":{"driverId":"norris","code":"NOR","givenName":"Lando","familyName":"Norris"},
                "Constructor":{"name":"McLaren"},
                "FastestLap":{"rank":"1","Time":{"time":"1:15.4"}}}]}]}}});
        let out = norm_results(&raw);
        assert_eq!(out["raceName"], "Spanish Grand Prix");
        assert_eq!(out["country"], "Spain");
        let r = &out["results"][0];
        assert_eq!(r["position"], 1);
        assert_eq!(r["driver"]["familyName"], "Norris");
        assert_eq!(r["fastestLapRank"], "1");
        assert_eq!(r["fastestLapTime"], "1:15.4");
    }

    #[test]
    fn results_with_no_race_is_null() {
        let raw = json!({"MRData":{"RaceTable":{"Races":[]}}});
        assert!(norm_results(&raw).is_null());
    }

    #[test]
    fn normalizes_qualifying() {
        let raw = json!({"MRData":{"RaceTable":{"Races":[{
            "season":"2026","round":"9","raceName":"Spanish Grand Prix",
            "QualifyingResults":[{"position":"1",
                "Driver":{"driverId":"piastri","code":"PIA","familyName":"Piastri"},
                "Constructor":{"name":"McLaren"},
                "Q1":"1:16.0","Q2":"1:15.6","Q3":"1:15.1"}]}]}}});
        let r = &norm_qualifying(&raw)["results"][0];
        assert_eq!(r["q3"], "1:15.1");
        assert_eq!(r["driver"]["code"], "PIA");
    }

    #[test]
    fn normalizes_season_and_driver_season() {
        let season = json!({"MRData":{"RaceTable":{"Races":[
            {"season":"2026","round":"1","raceName":"Bahrain GP",
             "Circuit":{"circuitName":"Sakhir","Location":{"country":"Bahrain","locality":"Sakhir"}},
             "date":"2026-03-08"}]}}});
        let rounds = &norm_season(&season)["rounds"];
        assert_eq!(rounds[0]["round"], 1);
        assert_eq!(rounds[0]["country"], "Bahrain");

        let ds = json!({"MRData":{"RaceTable":{"Races":[
            {"round":"1","raceName":"Bahrain GP","Results":[{"position":"3","points":"15","grid":"4","status":"Finished"}]}]}}});
        let r = &norm_driver_season(&ds)["rounds"][0];
        assert_eq!(r["position"], 3);
        assert_eq!(r["points"], 15.0);
    }
}
