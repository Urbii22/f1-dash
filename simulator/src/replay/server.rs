use std::{env, sync::Arc};

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

    for update in state.lines.iter().skip(1) {
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
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }

    let _ = tx.send(Message::Close(None)).await;

    info!("connection closed");
}

async fn wait_for_subscribe_invocation(
    rx: &mut futures::stream::SplitStream<WebSocket>,
) -> Option<String> {
    while let Some(Ok(msg)) = rx.next().await {
        let Message::Text(text) = msg else {
            continue;
        };

        for frame in text.split('\u{001e}').filter(|frame| !frame.trim().is_empty()) {
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
