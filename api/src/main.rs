use std::env;

use anyhow::Error;
use axum::{
    Router,
    http::{HeaderValue, Method},
    routing::get,
};

use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;
use tracing::info;

use shared::tracing_subscriber;

mod endpoints {
    pub(crate) mod archive;
    pub(crate) mod health;
    pub(crate) mod schedule;
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber();

    let addr = env::var("ADDRESS").unwrap_or_else(|_| "0.0.0.0:80".to_string());

    let archive_state = endpoints::archive::ArchiveState {
        db_path: env::var("ARCHIVE_DB")
            .unwrap_or_else(|_| "./archive.sqlite".into())
            .into(),
    };
    let app = Router::new()
        .route("/api/schedule", get(endpoints::schedule::get))
        .route("/api/schedule/next", get(endpoints::schedule::get_next))
        .route("/api/health", get(endpoints::health::check))
        .route("/api/archive/sessions", get(endpoints::archive::sessions))
        .route(
            "/api/archive/sessions/{id}",
            get(endpoints::archive::session),
        )
        .route(
            "/api/archive/sessions/{id}/laps",
            get(endpoints::archive::laps),
        )
        .route(
            "/api/archive/sessions/{id}/stints",
            get(endpoints::archive::stints),
        )
        .route(
            "/api/archive/sessions/{id}/events",
            get(endpoints::archive::events),
        )
        .route(
            "/api/archive/sessions/{id}/telemetry",
            get(endpoints::archive::telemetry),
        )
        .with_state(archive_state);

    info!(addr, "starting api http server");

    axum::serve(TcpListener::bind(addr).await?, app).await?;

    Ok(())
}

pub fn cors_layer() -> Result<CorsLayer, anyhow::Error> {
    let origin = env::var("ORIGIN").unwrap_or_else(|_| "https://f1-dash.com".to_string());

    let origins = origin
        .split(';')
        .filter_map(|o| HeaderValue::from_str(o).ok())
        .collect::<Vec<HeaderValue>>();

    Ok(CorsLayer::new()
        .allow_origin(origins)
        .allow_methods([Method::GET, Method::CONNECT]))
}
