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
    pub(crate) mod f1data;
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
    let app = build_app(archive_state)?;

    info!(addr, "starting api http server");

    axum::serve(TcpListener::bind(addr).await?, app).await?;

    Ok(())
}

fn build_app(archive_state: endpoints::archive::ArchiveState) -> Result<Router, Error> {
    let cors = cors_layer()?;
    let app = Router::new()
        .route("/api/schedule", get(endpoints::schedule::get))
        .route("/api/schedule/next", get(endpoints::schedule::get_next))
        .route("/api/health", get(endpoints::health::check))
        .route(
            "/api/f1/standings/drivers",
            get(endpoints::f1data::driver_standings),
        )
        .route(
            "/api/f1/standings/constructors",
            get(endpoints::f1data::constructor_standings),
        )
        .route("/api/f1/season", get(endpoints::f1data::season))
        .route("/api/f1/results", get(endpoints::f1data::results))
        .route("/api/f1/qualifying", get(endpoints::f1data::qualifying))
        .route("/api/f1/pitstops", get(endpoints::f1data::pit_stops))
        .route("/api/f1/sprint", get(endpoints::f1data::sprint))
        .route(
            "/api/f1/driver/{driverId}",
            get(endpoints::f1data::driver_season),
        )
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
        .with_state(archive_state)
        .layer(cors);

    Ok(app)
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

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, header},
    };
    use tower::ServiceExt;

    #[tokio::test]
    async fn cors_preflight_allows_configured_origin() {
        unsafe { env::set_var("ORIGIN", "http://localhost:3000") };
        let state = endpoints::archive::ArchiveState {
            db_path: "unused-test.sqlite".into(),
        };
        let response = build_app(state)
            .expect("router")
            .oneshot(
                Request::builder()
                    .method(Method::OPTIONS)
                    .uri("/api/health")
                    .header(header::ORIGIN, "http://localhost:3000")
                    .header(header::ACCESS_CONTROL_REQUEST_METHOD, "GET")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("response");

        assert_eq!(
            response.headers().get(header::ACCESS_CONTROL_ALLOW_ORIGIN),
            Some(&HeaderValue::from_static("http://localhost:3000"))
        );
    }
}
