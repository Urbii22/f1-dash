use std::sync::Arc;

use axum::{extract::State, http::StatusCode, response::IntoResponse};
use serde_json::Value;

use crate::http_server::Context;

fn map_to_vec(value: Value) -> Vec<Value> {
    match value {
        Value::Object(map) => map
            .into_iter()
            .filter(|(_, v)| v.is_object())
            .map(|(_, v)| v)
            .collect(),
        _ => vec![],
    }
}

fn drivers_from_state(state: &Value) -> Vec<Value> {
    state
        .pointer("/DriverList")
        .cloned()
        .map(map_to_vec)
        .unwrap_or_default()
}

pub async fn drivers(State(ctx): State<Arc<Context>>) -> impl IntoResponse {
    match ctx.state_service.get_state().await {
        Ok(state) => Ok(axum::Json(drivers_from_state(&state))),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(serde_json::json!({
                "error": format!("Failed to get current state: {}", e),
            })),
        )),
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::drivers_from_state;

    #[test]
    fn missing_driver_list_is_an_empty_collection() {
        assert!(drivers_from_state(&json!({})).is_empty());
    }

    #[test]
    fn driver_map_is_exposed_as_a_collection() {
        let drivers = drivers_from_state(&json!({
            "DriverList": {
                "1": { "RacingNumber": "1" },
                "3": { "RacingNumber": "3" }
            }
        }));

        assert_eq!(drivers.len(), 2);
    }
}
