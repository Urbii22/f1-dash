use axum::{Json, http::StatusCode, response::IntoResponse};
use serde_json::json;

pub async fn check() -> impl IntoResponse {
    (StatusCode::OK, Json(json!({ "success": true })))
}
