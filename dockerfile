FROM rust:alpine AS builder

RUN apk add --no-cache musl-dev pkgconfig openssl-libs-static openssl-dev

WORKDIR /usr/src/app

COPY Cargo.lock Cargo.toml ./
COPY api api
COPY archive archive
COPY realtime realtime
COPY shared shared
COPY signalr signalr
COPY simulator simulator

RUN cargo build --release --locked -p api -p realtime -p archive

FROM alpine:3 AS runtime

RUN apk add --no-cache ca-certificates libgcc wget \
    && addgroup -S f1dash \
    && adduser -S -G f1dash -h /home/f1dash f1dash \
    && mkdir -p /data/archive /data/cache /data/recordings \
    && chown -R f1dash:f1dash /data /home/f1dash

WORKDIR /app
USER f1dash

FROM runtime AS api
COPY --from=builder /usr/src/app/target/release/api /usr/local/bin/api
ENV ADDRESS=0.0.0.0:4001 \
    ARCHIVE_DB=/data/archive/archive.sqlite \
    XDG_CACHE_HOME=/data/cache
EXPOSE 4001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:4001/api/health >/dev/null || exit 1
CMD ["api"]

FROM runtime AS realtime
COPY --from=builder /usr/src/app/target/release/realtime /usr/local/bin/realtime
ENV ADDRESS=0.0.0.0:4000 \
    RECORDINGS_DIR=/data/recordings
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:4000/api/health >/dev/null || exit 1
CMD ["realtime"]

FROM runtime AS archive
COPY --from=builder /usr/src/app/target/release/archive /usr/local/bin/archive
ENV ARCHIVE_DB=/data/archive/archive.sqlite \
    RECORDINGS_DIR=/data/recordings
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD grep -qa archive /proc/1/cmdline || exit 1
CMD ["archive", "watch"]
