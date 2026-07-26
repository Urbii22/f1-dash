use anyhow::Error;
use serde_json::{Value, json};
use tokio::sync::broadcast::Sender;
use tokio_stream::StreamExt;
use tracing::{error, trace, warn};

use crate::recorder::{RecorderHandle, RecorderMsg};
use crate::services::state_service::StateService;

const URL: &str = "livetiming.formula1.com/signalrcore";
const HUB: &str = "Streaming";

const TOPICS: [&str; 17] = [
    "Heartbeat",
    "CarData.z",
    "Position.z",
    "ExtrapolatedClock",
    "TimingStats",
    "TimingAppData",
    "WeatherData",
    "TrackStatus",
    "SessionStatus",
    "DriverList",
    "RaceControlMessages",
    "SessionInfo",
    "SessionData",
    "LapCount",
    "TimingData",
    "TeamRadio",
    "ChampionshipPrediction",
];

fn session_is_active(state: &Value) -> bool {
    matches!(
        state
            .pointer("/SessionStatus/Status")
            .and_then(Value::as_str),
        Some("Inactive" | "Started")
    )
}

fn team_metadata(racing_number: &str) -> Option<(&'static str, &'static str)> {
    match racing_number {
        "1" | "67" | "81" => Some(("McLaren", "F47600")),
        "12" | "63" | "72" => Some(("Mercedes", "00D7B6")),
        "3" | "6" | "36" => Some(("Red Bull Racing", "4781D7")),
        "16" | "38" | "44" => Some(("Ferrari", "ED1131")),
        "23" | "46" | "55" => Some(("Williams", "64C4FF")),
        "30" | "41" => Some(("Racing Bulls", "6692FF")),
        "14" | "18" => Some(("Aston Martin", "229971")),
        "31" | "87" => Some(("Haas F1 Team", "B6BABD")),
        "5" | "27" | "97" => Some(("Audi", "111111")),
        "10" | "43" => Some(("Alpine", "0093CC")),
        "11" | "25" | "77" => Some(("Cadillac", "C6A35A")),
        _ => None,
    }
}

fn enrich_driver_list(state: &mut Value) {
    let Some(drivers) = state
        .pointer_mut("/DriverList")
        .and_then(Value::as_object_mut)
    else {
        return;
    };

    for (key, driver) in drivers {
        let Some(driver) = driver.as_object_mut() else {
            continue;
        };
        let racing_number = driver
            .get("RacingNumber")
            .and_then(Value::as_str)
            .unwrap_or(key);
        let Some((team_name, team_colour)) = team_metadata(racing_number) else {
            continue;
        };

        if driver
            .get("TeamName")
            .and_then(Value::as_str)
            .is_none_or(str::is_empty)
        {
            driver.insert("TeamName".into(), Value::String(team_name.into()));
        }
        if driver
            .get("TeamColour")
            .and_then(Value::as_str)
            .is_none_or(str::is_empty)
        {
            driver.insert("TeamColour".into(), Value::String(team_colour.into()));
        }
    }
}

pub async fn ingest_f1(
    state_service: StateService,
    update_sender: Sender<String>,
    recorder: RecorderHandle,
) -> Result<(), Error> {
    let mut client = signalr::create_client(URL, HUB).await?;

    let mut initial = signalr::subscribe(&mut client, &TOPICS).await?;
    enrich_driver_list(&mut initial);
    let active_session = session_is_active(&initial);

    if active_session {
        recorder.send(RecorderMsg::Initial(initial.clone()));
        state_service.set_state(initial.clone()).await?;

        if let Err(err) = update_sender.send(initial.to_string()) {
            trace!(?err, "no connected clients for initial session state");
        }
    } else {
        warn!("ignoring completed or unavailable session snapshot");
        state_service.set_state(json!({})).await?;
    }

    let mut stream = signalr::listen(client);

    while let Some(items) = stream.next().await {
        for update in items {
            trace!(?update.topic, "received update");

            if !active_session {
                if update.topic == "SessionInfo" && update.data.pointer("/Name").is_some() {
                    warn!("received SessionInfo event, restarting...");
                    return Ok(());
                }
                continue;
            }

            if update.topic == "SessionInfo" && update.data.pointer("/Name").is_some() {
                warn!("received SessionInfo event, restarting...");
                return Ok(());
            }

            let mut payload = json!({ update.topic.clone(): update.data });
            enrich_driver_list(&mut payload);

            recorder.send(RecorderMsg::Update {
                topic: update.topic.clone(),
                data: payload.get(&update.topic).cloned().unwrap_or(Value::Null),
                timestamp: update.timestamp.clone(),
            });

            if let Err(err) = update_sender.send(payload.to_string()) {
                error!(?err, "failed to send update");
            }

            if let Err(err) = state_service.update_state(payload).await {
                error!(?err, "failed to update state");
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{enrich_driver_list, session_is_active};

    #[test]
    fn inactive_and_started_sessions_are_active() {
        for status in ["Inactive", "Started"] {
            assert!(session_is_active(&json!({
                "SessionStatus": { "Status": status }
            })));
        }

        for status in ["Finished", "Finalised", "Ends"] {
            assert!(!session_is_active(&json!({
                "SessionStatus": { "Status": status }
            })));
        }
    }

    #[test]
    fn missing_session_status_is_not_active() {
        assert!(!session_is_active(&json!({
            "SessionInfo": { "Name": "Race" }
        })));
    }

    #[test]
    fn fills_missing_team_metadata_for_regular_and_fp1_drivers() {
        let mut state = json!({
            "DriverList": {
                "1": { "RacingNumber": "1", "TeamName": "", "TeamColour": "" },
                "67": { "RacingNumber": "67" },
                "25": { "RacingNumber": "25" },
                "97": { "RacingNumber": "97" }
            }
        });

        enrich_driver_list(&mut state);

        assert_eq!(
            state.pointer("/DriverList/1/TeamName"),
            Some(&json!("McLaren"))
        );
        assert_eq!(
            state.pointer("/DriverList/67/TeamColour"),
            Some(&json!("F47600"))
        );
        assert_eq!(
            state.pointer("/DriverList/25/TeamName"),
            Some(&json!("Cadillac"))
        );
        assert_eq!(
            state.pointer("/DriverList/97/TeamColour"),
            Some(&json!("111111"))
        );
    }

    #[test]
    fn preserves_team_metadata_from_the_feed() {
        let mut state = json!({
            "DriverList": {
                "1": {
                    "RacingNumber": "1",
                    "TeamName": "Feed Team",
                    "TeamColour": "ABCDEF"
                }
            }
        });

        enrich_driver_list(&mut state);

        assert_eq!(
            state.pointer("/DriverList/1/TeamName"),
            Some(&json!("Feed Team"))
        );
        assert_eq!(
            state.pointer("/DriverList/1/TeamColour"),
            Some(&json!("ABCDEF"))
        );
    }
}
