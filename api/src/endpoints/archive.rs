use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use rusqlite::{Connection, OpenFlags, params};
use serde::Deserialize;
use serde_json::{Value, json};
use std::{collections::BTreeMap, path::PathBuf};

#[derive(Clone)]
pub struct ArchiveState {
    pub db_path: PathBuf,
}
type ApiResult = Result<Json<Value>, ArchiveError>;
pub enum ArchiveError {
    Missing,
    NotFound,
    Internal(String),
}
impl IntoResponse for ArchiveError {
    fn into_response(self) -> Response {
        match self {
            Self::Missing => (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({"error":"no archived sessions are available"})),
            )
                .into_response(),
            Self::NotFound => (
                StatusCode::NOT_FOUND,
                Json(json!({"error":"session not found"})),
            )
                .into_response(),
            Self::Internal(message) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error":message})),
            )
                .into_response(),
        }
    }
}

fn open(path: &PathBuf) -> Result<Connection, ArchiveError> {
    if !path.exists() {
        return Err(ArchiveError::Missing);
    }
    Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .map_err(|e| ArchiveError::Internal(e.to_string()))
}
async fn blocking<F>(f: F) -> ApiResult
where
    F: FnOnce() -> Result<Value, ArchiveError> + Send + 'static,
{
    tokio::task::spawn_blocking(f)
        .await
        .map_err(|e| ArchiveError::Internal(e.to_string()))?
        .map(Json)
}

#[derive(Deserialize)]
pub struct SessionFilters {
    year: Option<i64>,
    kind: Option<String>,
}
pub async fn sessions(
    State(state): State<ArchiveState>,
    Query(filters): Query<SessionFilters>,
) -> ApiResult {
    blocking(move || {
        let db = open(&state.db_path)?;
        let mut sql = "SELECT id,path,year,meeting,country,kind,name,start_utc,complete FROM sessions WHERE 1=1".to_string();
        if filters.year.is_some() {
            sql.push_str(" AND year=?1");
        }
        if filters.kind.is_some() {
            sql.push_str(if filters.year.is_some() { " AND kind=?2" } else { " AND kind=?1" });
        }
        sql.push_str(" ORDER BY start_utc DESC");
        let mut stmt = db.prepare(&sql).map_err(internal)?;
        let values = match (filters.year, filters.kind.as_deref()) {
            (Some(year), Some(kind)) => stmt.query_map(params![year, kind], session_row),
            (Some(year), None) => stmt.query_map(params![year], session_row),
            (None, Some(kind)) => stmt.query_map(params![kind], session_row),
            (None, None) => stmt.query_map([], session_row),
        }
        .map_err(internal)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(internal)?;
        Ok(Value::Array(values))
    })
    .await
}
fn session_row(row: &rusqlite::Row) -> rusqlite::Result<Value> {
    Ok(
        json!({"id":row.get::<_,i64>(0)?,"path":row.get::<_,String>(1)?,"year":row.get::<_,i64>(2)?,"meeting":row.get::<_,String>(3)?,"country":row.get::<_,Option<String>>(4)?,"kind":row.get::<_,String>(5)?,"name":row.get::<_,String>(6)?,"startUtc":row.get::<_,Option<String>>(7)?,"complete":row.get::<_,i64>(8)?==1}),
    )
}

pub async fn session(State(state): State<ArchiveState>, Path(id): Path<i64>) -> ApiResult {
    blocking(move||{let db=open(&state.db_path)?;let mut value=db.query_row("SELECT id,path,year,meeting,country,circuit,kind,name,start_utc,end_utc,total_laps,complete FROM sessions WHERE id=?",[id],|r|Ok(json!({"id":r.get::<_,i64>(0)?,"path":r.get::<_,String>(1)?,"year":r.get::<_,i64>(2)?,"meeting":r.get::<_,String>(3)?,"country":r.get::<_,Option<String>>(4)?,"circuit":r.get::<_,Option<String>>(5)?,"kind":r.get::<_,String>(6)?,"name":r.get::<_,String>(7)?,"startUtc":r.get::<_,Option<String>>(8)?,"endUtc":r.get::<_,Option<String>>(9)?,"totalLaps":r.get::<_,Option<i64>>(10)?,"complete":r.get::<_,i64>(11)?==1}))).map_err(|e|if matches!(e,rusqlite::Error::QueryReturnedNoRows){ArchiveError::NotFound}else{ArchiveError::Internal(e.to_string())})?;let drivers=query_values(&db,"SELECT nr,tla,full_name,team_name,team_colour FROM drivers WHERE session_id=? ORDER BY nr",id,|r|Ok(json!({"racingNumber":r.get::<_,String>(0)?,"tla":r.get::<_,Option<String>>(1)?,"fullName":r.get::<_,Option<String>>(2)?,"teamName":r.get::<_,Option<String>>(3)?,"teamColour":r.get::<_,Option<String>>(4)?})))?;value["drivers"]=Value::Array(drivers);value["weatherSummary"]=db.query_row("SELECT MIN(air_temp),MAX(air_temp),MIN(track_temp),MAX(track_temp),MAX(rainfall) FROM weather WHERE session_id=?",[id],|r|Ok(json!({"airMin":r.get::<_,Option<f64>>(0)?,"airMax":r.get::<_,Option<f64>>(1)?,"trackMin":r.get::<_,Option<f64>>(2)?,"trackMax":r.get::<_,Option<f64>>(3)?,"rainfall":r.get::<_,Option<f64>>(4)?}))).map_err(internal)?;Ok(value)}).await
}

#[derive(Deserialize)]
pub struct LapFilter {
    driver: Option<String>,
}
pub async fn laps(
    State(state): State<ArchiveState>,
    Path(id): Path<i64>,
    Query(filter): Query<LapFilter>,
) -> ApiResult {
    blocking(move||{let db=open(&state.db_path)?;ensure_session(&db,id)?;let mut stmt=db.prepare("SELECT driver_nr,lap,lap_time_ms,s1_ms,s2_ms,s3_ms,position,gap_leader_ms,compound,tyre_age,pitted,utc,speed_trap_kph FROM laps WHERE session_id=? AND (? IS NULL OR driver_nr=?) ORDER BY driver_nr,lap").map_err(internal)?;let rows=stmt.query_map(params![id,filter.driver,filter.driver],|r|Ok((r.get::<_,String>(0)?,json!({"lap":r.get::<_,i64>(1)?,"lapTimeMs":r.get::<_,Option<i64>>(2)?,"sectorsMs":[r.get::<_,Option<i64>>(3)?,r.get::<_,Option<i64>>(4)?,r.get::<_,Option<i64>>(5)?],"position":r.get::<_,Option<i64>>(6)?,"gapToLeaderMs":r.get::<_,Option<i64>>(7)?,"compound":r.get::<_,Option<String>>(8)?,"tyreAge":r.get::<_,Option<i64>>(9)?,"pitted":r.get::<_,i64>(10)?==1,"utc":r.get::<_,String>(11)?,"speedTrapKph":r.get::<_,Option<i64>>(12)?})))).map_err(internal)?;Ok(group(rows.collect::<Result<Vec<_>,_>>().map_err(internal)?,"laps"))}).await
}
pub async fn stints(State(state): State<ArchiveState>, Path(id): Path<i64>) -> ApiResult {
    blocking(move||{let db=open(&state.db_path)?;ensure_session(&db,id)?;let rows=query_values(&db,"SELECT driver_nr,stint,compound,start_lap,end_lap,lap_count,best_ms,avg_ms,deg_ms_per_lap FROM stints WHERE session_id=? ORDER BY driver_nr,stint",id,|r|Ok(json!({"driverNr":r.get::<_,String>(0)?,"stint":r.get::<_,i64>(1)?,"compound":r.get::<_,Option<String>>(2)?,"startLap":r.get::<_,i64>(3)?,"endLap":r.get::<_,i64>(4)?,"lapCount":r.get::<_,i64>(5)?,"bestMs":r.get::<_,Option<i64>>(6)?,"avgMs":r.get::<_,Option<f64>>(7)?,"degMsPerLap":r.get::<_,Option<f64>>(8)?})))?;let pairs=rows.into_iter().map(|mut v|{let nr=v["driverNr"].as_str().unwrap().to_owned();v.as_object_mut().unwrap().remove("driverNr");(nr,v)}).collect();Ok(group(pairs,"stints"))}).await
}
pub async fn events(State(state): State<ArchiveState>, Path(id): Path<i64>) -> ApiResult {
    blocking(move||{let db=open(&state.db_path)?;ensure_session(&db,id)?;Ok(Value::Array(query_values(&db,"SELECT utc,kind,driver_nr,lap,message FROM events WHERE session_id=? ORDER BY utc",id,|r|{let nr:String=r.get(2)?;Ok(json!({"utc":r.get::<_,String>(0)?,"kind":r.get::<_,String>(1)?,"driverNr":if nr.is_empty(){None}else{Some(nr)},"lap":r.get::<_,Option<i64>>(3)?,"message":r.get::<_,Option<String>>(4)?}))})?))}).await
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TelemetryFilter {
    driver: String,
    lap: Option<i64>,
    from_lap: Option<i64>,
    to_lap: Option<i64>,
}
pub async fn telemetry(
    State(state): State<ArchiveState>,
    Path(id): Path<i64>,
    Query(filter): Query<TelemetryFilter>,
) -> ApiResult {
    blocking(move||{let db=open(&state.db_path)?;ensure_session(&db,id)?;let from=filter.lap.or(filter.from_lap).unwrap_or(0);let to=filter.lap.or(filter.to_lap).unwrap_or(i64::MAX);let rows=query_values2(&db,"SELECT ts_ms - MIN(ts_ms) OVER (PARTITION BY lap),lap,speed,rpm,gear,throttle,brake FROM telemetry WHERE session_id=? AND driver_nr=? AND lap BETWEEN ? AND ? ORDER BY ts_ms",params![id,filter.driver,from,to],|r|Ok(json!({"tMs":r.get::<_,i64>(0)?,"lap":r.get::<_,Option<i64>>(1)?,"speed":r.get::<_,Option<i64>>(2)?,"rpm":r.get::<_,Option<i64>>(3)?,"gear":r.get::<_,Option<i64>>(4)?,"throttle":r.get::<_,Option<i64>>(5)?,"brake":r.get::<_,Option<i64>>(6)?})))?;Ok(json!({"samples":rows}))}).await
}

fn ensure_session(db: &Connection, id: i64) -> Result<(), ArchiveError> {
    if db
        .query_row("SELECT 1 FROM sessions WHERE id=?", [id], |r| {
            r.get::<_, i64>(0)
        })
        .is_err()
    {
        Err(ArchiveError::NotFound)
    } else {
        Ok(())
    }
}
fn internal(error: rusqlite::Error) -> ArchiveError {
    ArchiveError::Internal(error.to_string())
}
fn query_values<F>(db: &Connection, sql: &str, id: i64, map: F) -> Result<Vec<Value>, ArchiveError>
where
    F: FnMut(&rusqlite::Row) -> rusqlite::Result<Value>,
{
    query_values2(db, sql, [id], map)
}
fn query_values2<P, F>(
    db: &Connection,
    sql: &str,
    params: P,
    map: F,
) -> Result<Vec<Value>, ArchiveError>
where
    P: rusqlite::Params,
    F: FnMut(&rusqlite::Row) -> rusqlite::Result<Value>,
{
    let mut stmt = db.prepare(sql).map_err(internal)?;
    stmt.query_map(params, map)
        .map_err(internal)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(internal)
}
fn group(pairs: Vec<(String, Value)>, key: &str) -> Value {
    let mut grouped: BTreeMap<String, Vec<Value>> = BTreeMap::new();
    for (nr, value) in pairs {
        grouped.entry(nr).or_default().push(value)
    }
    json!({key:grouped})
}
