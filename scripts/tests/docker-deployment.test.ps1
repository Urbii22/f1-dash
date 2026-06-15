$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

function Read-RepoFile([string]$Path) {
    $fullPath = Join-Path $root $Path
    if (-not (Test-Path -LiteralPath $fullPath)) {
        throw "Missing required file: $Path"
    }
    return Get-Content -Raw -LiteralPath $fullPath
}

function Assert-Contains([string]$Content, [string]$Pattern, [string]$Message) {
    if ($Content -notmatch $Pattern) {
        throw $Message
    }
}

$compose = Read-RepoFile "compose.yaml"
$production = Read-RepoFile "compose.production.yaml"
$dockerfile = Read-RepoFile "dockerfile"
$dashboardDockerfile = Read-RepoFile "dashboard\dockerfile"
$nextConfig = Read-RepoFile "dashboard\next.config.ts"
$caddy = Read-RepoFile "Caddyfile"
$apiMain = Read-RepoFile "api\src\main.rs"

foreach ($service in @("web", "api", "realtime", "archive")) {
    Assert-Contains $compose "(?m)^  ${service}:\s*$" "compose.yaml must define $service."
}
foreach ($port in @("3000:3000", "4000:4000", "4001:4001")) {
    Assert-Contains $compose ([regex]::Escape($port)) "compose.yaml must publish $port locally."
}
foreach ($target in @("target: api", "target: realtime", "target: archive")) {
    Assert-Contains $compose ([regex]::Escape($target)) "compose.yaml must build $target."
}
foreach ($value in @("API_URL: http://api:4001", "NEXT_PUBLIC_LIVE_URL: http://localhost:4000", "restart: unless-stopped", "condition: service_healthy", "recordings:", "archive-data:", "api-cache:")) {
    Assert-Contains $compose ([regex]::Escape($value)) "compose.yaml is missing '$value'."
}
Assert-Contains $compose "ORIGIN:.*localhost:3000.*127\.0\.0\.1:3000" "Local CORS must allow localhost and 127.0.0.1."
Assert-Contains $compose "test:.*api/health" "Compose must define HTTP healthchecks."

foreach ($service in @("web", "api", "realtime")) {
    Assert-Contains $production "(?ms)^  ${service}:.*?ports:\s*!reset\s*\[\]" "Production must reset $service ports."
}
Assert-Contains $production "F1_DASH_DOMAIN:\?" "Production must require F1_DASH_DOMAIN with a Compose interpolation error."
Assert-Contains $production "profiles:\s*\[production\]" "Caddy must use the production profile."
Assert-Contains $production "80:80" "Caddy must publish port 80."
Assert-Contains $production "443:443" "Caddy must publish port 443."

foreach ($route in @("/api/realtime", "/api/current", "/api/drivers", "/api/realtime/health", "/api/health")) {
    Assert-Contains $caddy ([regex]::Escape($route)) "Caddyfile must route $route."
}
Assert-Contains $caddy "reverse_proxy web:3000" "Caddyfile must proxy the dashboard."

foreach ($member in @("COPY archive archive", "COPY simulator simulator", "COPY signalr signalr")) {
    Assert-Contains $dockerfile ([regex]::Escape($member)) "The Rust image must include '$member'."
}
foreach ($target in @("AS api", "AS realtime", "AS archive")) {
    Assert-Contains $dockerfile ([regex]::Escape($target)) "The Rust image must expose '$target'."
}
Assert-Contains $dockerfile "USER f1dash" "Rust runtime images must run as a non-root user."
Assert-Contains $dashboardDockerfile "yarn install --immutable" "Dashboard image must use immutable Yarn installs."
Assert-Contains $dashboardDockerfile "ARG NEXT_PUBLIC_LIVE_URL" "Dashboard public URL must be a build argument."
Assert-Contains $nextConfig 'process\.env\.NEXT_NO_COMPRESS !== "1"' "NEXT_NO_COMPRESS=1 must disable Next.js compression."
Assert-Contains $apiMain "\.layer\(cors\)" "The API router must install its CORS layer."

$verifyWorkflow = Read-RepoFile ".github\workflows\verify.yaml"
$releaseWorkflow = Read-RepoFile ".github\workflows\release.yaml"

foreach ($check in @("cargo fmt", "cargo clippy", "cargo test --workspace", "yarn test", "yarn lint", "yarn npm audit", "yarn build", "docker-deployment.test.ps1")) {
    Assert-Contains $verifyWorkflow ([regex]::Escape($check)) "Verification workflow must run '$check'."
}
Assert-Contains $releaseWorkflow "needs:.*verify" "Publishing must depend on verification."
Assert-Contains $releaseWorkflow "github\.repository_owner" "Publishing must use the current repository owner."
Assert-Contains $releaseWorkflow "f1-dash-archive" "Publishing must include the archive image."

Write-Host "docker deployment static tests passed" -ForegroundColor Green
