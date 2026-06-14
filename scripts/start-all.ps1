<#
.SYNOPSIS
    Launches all f1-dash local services (api, realtime, dashboard) for development.

.DESCRIPTION
    Frees the ports it owns, builds the Rust services once, then starts each
    service in its own PowerShell window so logs stay visible and any service
    can be stopped independently with Ctrl+C. Finally opens the dashboard.

    Topology (real-data / live mode):
      - api        Rust  http://localhost:4001   (schedule feed)
      - realtime   Rust  http://localhost:4000   (live timing SSE, connects to F1)
      - dashboard  Next  http://localhost:3000   (web UI)

    Note: this fork's `realtime` connects directly to the live F1 feed over a
    hardcoded wss endpoint and cannot ingest from the local simulator, so the
    simulator is intentionally not started here.

.PARAMETER NoBrowser
    Do not auto-open the dashboard in the default browser.

.PARAMETER SkipBuild
    Skip `cargo build` and launch the already-compiled binaries directly.
#>
param(
    [switch]$NoBrowser,
    [switch]$SkipBuild,
    [switch]$WithArchive
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$dashboardDir = Join-Path $Root "dashboard"

. (Join-Path $PSScriptRoot "launcher-utils.ps1")

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " f1-dash launcher" -ForegroundColor Cyan
Write-Host " root: $Root" -ForegroundColor DarkGray
Write-Host "==================================================" -ForegroundColor Cyan

# --- 1. Free the ports we own (idempotent restart, clears stale instances) ---
$ports = 3000, 4000, 4001
Write-Host "`n[1/4] Freeing ports $($ports -join ', ') ..." -ForegroundColor Yellow
foreach ($port in $ports) {
    try {
        $owners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop |
            Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($processId in $owners) {
            Write-Host "  - stopping PID $processId on port $port" -ForegroundColor DarkGray
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    } catch {
        # No listener on this port; nothing to do.
    }
}

# Next.js uses a project-level development lock. A dashboard instance running
# on another port (for example :3001) still prevents this launcher from
# starting its :3000 instance, so stop matching Next processes by project path.
$dashboardProcesses = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue
$dashboardProcessIds = @(Get-DashboardDevProcessIds -Processes $dashboardProcesses -DashboardDir $dashboardDir)
foreach ($processId in $dashboardProcessIds) {
    Write-Host "  - stopping dashboard PID $processId (alternate port or stale dev instance)" -ForegroundColor DarkGray
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}

# --- 2. Build the Rust services once (avoids per-window build-lock contention) ---
if (-not $SkipBuild) {
    Write-Host "`n[2/4] Building Rust services (cargo build -p api -p realtime) ..." -ForegroundColor Yellow
    Push-Location $Root
    try {
    $packages = @('-p', 'api', '-p', 'realtime')
    if ($WithArchive) { $packages += @('-p', 'archive') }
    cargo build @packages
        if ($LASTEXITCODE -ne 0) { throw "cargo build failed (exit $LASTEXITCODE)" }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "`n[2/4] Skipping build (-SkipBuild) ..." -ForegroundColor Yellow
}

$apiExe      = Join-Path $Root "target\debug\api.exe"
$realtimeExe = Join-Path $Root "target\debug\realtime.exe"
$archiveExe  = Join-Path $Root "target\debug\archive.exe"
$required = @($apiExe, $realtimeExe)
if ($WithArchive) { $required += $archiveExe }
foreach ($exe in $required) {
    if (-not (Test-Path $exe)) { throw "Missing binary: $exe (run without -SkipBuild)" }
}

function Get-NodeVersion([string]$NodeExe) {
    try {
        $versionText = & $NodeExe --version 2>$null
        if ($LASTEXITCODE -eq 0 -and $versionText -match '^v(\d+)\.(\d+)\.(\d+)$') {
            return [version]"$($matches[1]).$($matches[2]).$($matches[3])"
        }
    } catch {
        return $null
    }

    return $null
}

function Resolve-DashboardRuntime() {
    $minimumNode = [version]'20.9.0'
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    $systemNode = if ($nodeCommand) { $nodeCommand.Source } else { $null }
    $corepackJs = $null
    if ($systemNode) {
        $corepackCandidate = Join-Path (Split-Path -Parent $systemNode) "node_modules\corepack\dist\corepack.js"
        if (Test-Path $corepackCandidate) {
            $corepackJs = $corepackCandidate
        }
    }

    $bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
    $candidates = @()
    if ($systemNode) { $candidates += @{ Path = $systemNode; Source = "system" } }
    if (Test-Path $bundledNode) { $candidates += @{ Path = $bundledNode; Source = "bundled" } }

    foreach ($candidate in $candidates) {
        $candidateVersion = Get-NodeVersion $candidate.Path
        if ($candidateVersion -and $candidateVersion -ge $minimumNode) {
            if (-not $corepackJs) {
                throw "Found a compatible Node.js runtime at '$($candidate.Path)', but corepack.js was not found next to the system Node install."
            }

            return @{
                NodeExe   = $candidate.Path
                NodeVer   = $candidateVersion
                Source    = $candidate.Source
                CorepackJs = $corepackJs
            }
        }
    }

    $detected = if ($candidates.Count -gt 0) {
        ($candidates | ForEach-Object {
            $version = Get-NodeVersion $_.Path
            if ($version) { "$($_.Path) ($version)" } else { "$($_.Path) (unknown version)" }
        }) -join ", "
    } else {
        "no Node.js installations found"
    }

    throw "Dashboard requires Node.js >= $minimumNode. Detected: $detected"
}

$dashboardRuntime = Resolve-DashboardRuntime
$dashboardPackageJson = Get-Content (Join-Path $dashboardDir "package.json") -Raw | ConvertFrom-Json
$dashboardPackageManager = [string]$dashboardPackageJson.packageManager
if (-not $dashboardPackageManager.StartsWith("yarn@")) {
    throw "Unsupported dashboard package manager '$dashboardPackageManager'."
}
$dashboardYarnVersion = $dashboardPackageManager.Substring(5)

# Helper: open a new PowerShell window running a command, with a window title.
function Start-ServiceWindow([string]$Title, [string]$Command) {
    $full = "`$host.UI.RawUI.WindowTitle = '$Title'; $Command"
    Start-Process powershell -ArgumentList '-NoExit', '-Command', $full | Out-Null
}

# --- 3. Launch the services, each in its own window ---
Write-Host "`n[3/4] Starting services ..." -ForegroundColor Yellow

# api :4001 (schedule)
Start-ServiceWindow "f1-dash api :4001" `
    "`$env:ADDRESS='0.0.0.0:4001'; `$env:RUST_LOG='api=info'; `$env:ORIGIN='http://localhost:3000'; `$env:ARCHIVE_DB='$Root\archive.sqlite'; & '$apiExe'"
Write-Host "  - api        -> http://localhost:4001" -ForegroundColor Green

# realtime :4000 (live timing SSE)
Start-ServiceWindow "f1-dash realtime :4000" `
    "`$env:ADDRESS='0.0.0.0:4000'; `$env:RUST_LOG='realtime=info'; `$env:ORIGIN='http://localhost:3000'; `$env:RECORDINGS_DIR='$Root\recordings'; `$env:RECORDING_ENABLED='true'; `$env:RECORDING_GZIP='true'; & '$realtimeExe'"
Write-Host "  - realtime   -> http://localhost:4000" -ForegroundColor Green

if ($WithArchive) {
    Start-ServiceWindow "f1-dash archive watcher" `
        "`$env:ARCHIVE_DB='$Root\archive.sqlite'; `$env:RECORDINGS_DIR='$Root\recordings'; `$env:RUST_LOG='archive=info'; & '$archiveExe' watch"
    Write-Host "  - archive watcher -> $Root\archive.sqlite" -ForegroundColor Green
}

# dashboard :3000 (Next.js dev)
if (-not (Test-Path (Join-Path $dashboardDir "node_modules"))) {
    Write-Host "  - dashboard deps missing; running 'corepack yarn install' first ..." -ForegroundColor DarkGray
}
Write-Host "  - dashboard node -> $($dashboardRuntime.NodeExe) [$($dashboardRuntime.NodeVer)]" -ForegroundColor DarkGray
$dashCorepack = "& '$($dashboardRuntime.NodeExe)' '$($dashboardRuntime.CorepackJs)'"
$dashCmd = "Set-Location '$dashboardDir'; " +
    "`$env:NEXT_PUBLIC_LIVE_URL='http://localhost:4000'; `$env:API_URL='http://localhost:4001'; " +
    "if (-not (Test-Path node_modules)) { $dashCorepack yarn@$dashboardYarnVersion install }; " +
    "$dashCorepack yarn@$dashboardYarnVersion dev"
Start-ServiceWindow "f1-dash dashboard :3000" $dashCmd
Write-Host "  - dashboard  -> http://localhost:3000" -ForegroundColor Green

# --- 4. Open the dashboard once it is likely up ---
Write-Host "`n[4/4] Waiting for the dashboard to come up ..." -ForegroundColor Yellow
if (-not $NoBrowser) {
    $up = $false
    for ($i = 0; $i -lt 90; $i++) {
        Start-Sleep -Seconds 1
        try {
            $null = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2
            $up = $true
            break
        } catch {
            # not ready yet
        }
    }
    if ($up) {
        Write-Host "  - dashboard is up, opening browser" -ForegroundColor Green
        Start-Process "http://localhost:3000"
    } else {
        Write-Host "  - dashboard did not respond on http://localhost:3000; check the dashboard window for errors" -ForegroundColor DarkYellow
    }
}

Write-Host "`nAll services launched. Close their windows (or run stop-f1-dash.bat) to stop." -ForegroundColor Cyan
