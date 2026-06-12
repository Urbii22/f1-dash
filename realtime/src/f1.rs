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
    state
        .pointer("/SessionStatus/Status")
        .and_then(Value::as_str)
        == Some("Started")
}

pub async fn ingest_f1(
    state_service: StateService,
    update_sender: Sender<String>,
    recorder: RecorderHandle,
) -> Result<(), Error> {
    let mut client = signalr::create_client(URL, HUB).await?;

    let initial = signalr::subscribe(&mut client, &TOPICS).await?;
    let active_session = session_is_active(&initial);

    if active_session {
        recorder.send(RecorderMsg::Initial(initial.clone()));
        state_service.set_state(initial.clone()).await?;

        if let Err(err) = update_sender.send(initial.to_string()) {
            trace!(?err, "no connected clients for initial session state");
        }
    } else {
        warn!("ignoring inactive session snapshot");
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

            recorder.send(RecorderMsg::Update {
                topic: update.topic.clone(),
                data: update.data.clone(),
                timestamp: update.timestamp.clone(),
            });

            if update.topic == "SessionInfo" && update.data.pointer("/Name").is_some() {
                warn!("received SessionInfo event, restarting...");
                return Ok(());
            }

            let payload = json!({ update.topic: update.data });

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

    use super::session_is_active;

    #[test]
    fn only_started_sessions_are_active() {
        assert!(session_is_active(&json!({
            "SessionStatus": { "Status": "Started" }
        })));

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
}
