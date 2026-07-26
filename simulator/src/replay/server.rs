use std::{env, sync::Arc, time::Duration};

use anyhow::Error;
use axum::{
    Router,
    extract::{
        State, WebSocketUpgrade,
        ws::{Message, WebSocket},
    },
    response::Response,
    routing::get,
};
use futures::{SinkExt, StreamExt};
use serde_json::Value;
use tokio::net::TcpListener;
use tracing::{debug, error, info};

pub struct AppState {
    lines: Vec<String>,
}

pub async fn run(lines: Vec<String>) -> Result<(), Error> {
    let addr = env::var("ADDRESS")?;

    let app_state = Arc::new(AppState { lines });

    let app = Router::new()
        .route("/ws", get(handle_http))
        .with_state(app_state);

    info!(addr, "starting simulator replay server");

    axum::serve(TcpListener::bind(addr).await?, app).await?;

    Ok(())
}

async fn handle_http(ws: WebSocketUpgrade, State(state): State<Arc<AppState>>) -> Response {
    info!("recived connection");

    ws.on_upgrade(|socket| handle_ws(socket, state))
}

async fn handle_ws(socket: WebSocket, state: Arc<AppState>) {
    let (mut tx, mut rx) = socket.split();

    let amount_of_updates = state.lines.len();

    debug!(amount_of_updates, "starting to send updates");

    let Some(handshake) = state.lines.first() else {
        return;
    };

    if let Err(e) = tx.send(Message::text(handshake)).await {
        error!("error sending handshake: {}", e);
        return;
    }

    let invocation_id = wait_for_subscribe_invocation(&mut rx).await;

    let replay_speed = env::var("REPLAY_SPEED")
        .ok()
        .and_then(|value| value.parse::<f64>().ok())
        .filter(|value| *value > 0.0)
        .unwrap_or(1.0);
    let mut previous_timestamped_update: Option<&str> = None;

    for update in state.lines.iter().skip(1) {
        if timestamp_millis(update).is_some() {
            if let Some(previous) = previous_timestamped_update {
                tokio::time::sleep(delay_between_updates(previous, update, replay_speed)).await;
            }
            previous_timestamped_update = Some(update);
        } else {
            tokio::time::sleep(Duration::from_millis(100)).await;
        }

        let update = match &invocation_id {
            Some(invocation_id) => rewrite_completion_invocation(update, invocation_id),
            None => update.clone(),
        };

        match tx.send(Message::text(update)).await {
            Ok(_) => {}
            Err(e) => {
                error!("error sending ws message: {}", e);
                break;
            }
        }
    }

    let _ = tx.send(Message::Close(None)).await;

    info!("connection closed");
}

fn timestamp_millis(update: &str) -> Option<u64> {
    let trimmed = update.trim_end_matches('\u{001e}');
    let parsed = serde_json::from_str::<Value>(trimmed).ok()?;
    let timestamp = parsed.pointer("/arguments/2")?.as_str()?;
    let time = timestamp.split('T').nth(1)?.trim_end_matches('Z');
    let mut parts = time.split(':');
    let hours = parts.next()?.parse::<u64>().ok()?;
    let minutes = parts.next()?.parse::<u64>().ok()?;
    let seconds_with_fraction = parts.next()?;
    let mut seconds_parts = seconds_with_fraction.split('.');
    let seconds = seconds_parts.next()?.parse::<u64>().ok()?;
    let millis = seconds_parts
        .next()
        .and_then(|fraction| format!("{fraction:0<3}")[..3].parse::<u64>().ok())
        .unwrap_or(0);

    Some((((hours * 60 + minutes) * 60 + seconds) * 1000) + millis)
}

fn delay_between_updates(previous: &str, current: &str, replay_speed: f64) -> Duration {
    let Some(previous_ms) = timestamp_millis(previous) else {
        return Duration::from_millis(100);
    };
    let Some(current_ms) = timestamp_millis(current) else {
        return Duration::from_millis(100);
    };

    let delta_ms = current_ms.saturating_sub(previous_ms);
    Duration::from_millis((delta_ms as f64 / replay_speed).round() as u64)
}

async fn wait_for_subscribe_invocation(
    rx: &mut futures::stream::SplitStream<WebSocket>,
) -> Option<String> {
    while let Some(Ok(msg)) = rx.next().await {
        let Message::Text(text) = msg else {
            continue;
        };

        for frame in text
            .split('\u{001e}')
            .filter(|frame| !frame.trim().is_empty())
        {
            let Ok(parsed) = serde_json::from_str::<Value>(frame) else {
                continue;
            };

            if parsed.pointer("/target").and_then(Value::as_str) != Some("Subscribe") {
                continue;
            }

            return parsed
                .pointer("/invocationId")
                .and_then(Value::as_str)
                .map(ToString::to_string);
        }
    }

    None
}

fn rewrite_completion_invocation(update: &str, invocation_id: &str) -> String {
    let trimmed = update.trim_end_matches('\u{001e}');
    let Ok(mut parsed) = serde_json::from_str::<Value>(trimmed) else {
        return update.to_string();
    };

    if parsed.pointer("/type").and_then(Value::as_i64) != Some(3) {
        return update.to_string();
    }

    parsed["invocationId"] = Value::String(invocation_id.to_string());
    format!("{}\u{001e}", parsed)
}

#[cfg(test)]
mod tests {
    use super::{delay_between_updates, timestamp_millis};

    #[test]
    fn extracts_feed_timestamp_as_milliseconds() {
        let frame = r#"{"type":1,"target":"feed","arguments":["TimingData",{},"2026-06-07T16:10:13.250Z"]}"#;
        assert_eq!(timestamp_millis(frame), Some(58_213_250));
    }

    #[test]
    fn calculates_scaled_non_negative_delay() {
        let previous = r#"{"type":1,"target":"feed","arguments":["TimingData",{},"2026-06-07T16:10:13.000Z"]}"#;
        let current = r#"{"type":1,"target":"feed","arguments":["TimingData",{},"2026-06-07T16:10:23.000Z"]}"#;

        assert_eq!(delay_between_updates(previous, current, 1.0).as_secs(), 10);
        assert_eq!(delay_between_updates(previous, current, 10.0).as_secs(), 1);
        assert_eq!(delay_between_updates(current, previous, 1.0).as_millis(), 0);
    }
}
