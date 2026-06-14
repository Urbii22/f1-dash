<#
.SYNOPSIS
    Launches all f1-dash local services (api, realtime, dashboard) for development.

.DESCRIPTION
    Frees the ports it owns, builds the Rust services once, then starts each
    service as a hidden child process. This console stays open as the single
    supervisor and stops every service when Ctrl+C is pressed.

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
$logDir = Join-Path $Root "logs"
$runtimeDir = Join-Path $Root ".runtime"
$statePath = Join-Path $runtimeDir "launcher-state.json"
$stopRequestPath = Join-Path $runtimeDir "stop-requested"

. (Join-Path $PSScriptRoot "launcher-utils.ps1")

Write-Host "==================================================" -ForegroundColor Cyan
Clear-LauncherStopRequest -Path $stopRequestPath

$previousState = Read-LauncherState -Path $statePath
if ($previousState) {
    Write-Host "Stopping previous launcher state ..." -ForegroundColor DarkGray
    $previousStopRequestPath = if ($previousState.StopRequestPath) {
        [string]$previousState.StopRequestPath
    } else {
        $stopRequestPath
    }
    Request-LauncherStop -Path $previousStopRequestPath
    if ($previousState.LauncherPid -and [int]$previousState.LauncherPid -ne $PID) {
        $previousLauncherPid = [int]$previousState.LauncherPid
        for ($i = 0; $i -lt 30; $i++) {
            if (-not (Get-Process -Id $previousLauncherPid -ErrorAction SilentlyContinue)) {
                break
            }
            Start-Sleep -Milliseconds 500
        }
        if (Get-Process -Id $previousLauncherPid -ErrorAction SilentlyContinue) {
            Stop-Process -Id $previousLauncherPid -Force -ErrorAction SilentlyContinue
        }
    }
    foreach ($service in @($previousState.Services)) {
        Stop-ProcessTree -RootProcessId ([int]$service.ProcessId)
    }
    Clear-LauncherStopRequest -Path $previousStopRequestPath
    Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
}
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

$legacyWindows = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue
$legacyWindowIds = @(Get-LegacyServiceWindowProcessIds -Processes $legacyWindows -RootDir $Root)
foreach ($processId in $legacyWindowIds) {
    Write-Host "  - closing legacy service window PID $processId" -ForegroundColor DarkGray
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

New-Item -ItemType Directory -Path $logDir, $runtimeDir -Force | Out-Null

function Start-HiddenService {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string]$Url,

        [Parameter(Mandatory = $true)]
        [string]$Command
    )

    $logs = Get-ServiceLogPaths -LogDir $logDir -ServiceName $Name
    Remove-Item -LiteralPath $logs.StdOut, $logs.StdErr -Force -ErrorAction SilentlyContinue
    $encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($Command))
    $process = Start-Process powershell `
        -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $encodedCommand `
        -WindowStyle Hidden `
        -RedirectStandardOutput $logs.StdOut `
        -RedirectStandardError $logs.StdErr `
        -PassThru

    [pscustomobject]@{
        Name = $Name
        ProcessId = $process.Id
        Url = $Url
        StdOut = $logs.StdOut
        StdErr = $logs.StdErr
    }
}

# --- 3. Launch hidden services under this supervisor console ---
Write-Host "`n[3/4] Starting services ..." -ForegroundColor Yellow
$services = @()

# api :4001 (schedule)
$services += Start-HiddenService -Name "api" -Url "http://localhost:4001" -Command `
    "`$env:ADDRESS='0.0.0.0:4001'; `$env:RUST_LOG='api=info'; `$env:ORIGIN='http://localhost:3000'; `$env:ARCHIVE_DB='$Root\archive.sqlite'; & '$apiExe'"
Write-Host "  - api        -> http://localhost:4001" -ForegroundColor Green

# realtime :4000 (live timing SSE)
$services += Start-HiddenService -Name "realtime" -Url "http://localhost:4000" -Command `
    "`$env:ADDRESS='0.0.0.0:4000'; `$env:RUST_LOG='realtime=info'; `$env:ORIGIN='http://localhost:3000'; `$env:RECORDINGS_DIR='$Root\recordings'; `$env:RECORDING_ENABLED='true'; `$env:RECORDING_GZIP='true'; & '$realtimeExe'"
Write-Host "  - realtime   -> http://localhost:4000" -ForegroundColor Green

if ($WithArchive) {
    $services += Start-HiddenService -Name "archive" -Url "watcher" -Command `
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
$services += Start-HiddenService -Name "dashboard" -Url "http://localhost:3000" -Command $dashCmd
Write-Host "  - dashboard  -> http://localhost:3000" -ForegroundColor Green

$launcherState = [pscustomobject]@{
    LauncherPid = $PID
    StartedAt = (Get-Date).ToString("o")
    StopRequestPath = $stopRequestPath
    Services = $services
}
Write-LauncherState -Path $statePath -State $launcherState

# --- 4. Open the dashboard once it is likely up ---
Write-Host "`n[4/4] Waiting for the dashboard to come up ..." -ForegroundColor Yellow
$up = $false
for ($i = 0; $i -lt 90; $i++) {
    Start-Sleep -Seconds 1
    $failedService = $services | Where-Object { -not (Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue) } | Select-Object -First 1
    if ($failedService) {
        Write-Host "  - $($failedService.Name) exited during startup; inspect $($failedService.StdErr)" -ForegroundColor Red
        break
    }
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2
        $up = $true
        break
    } catch {
        # not ready yet
    }
}
if ($up) {
    Write-Host "  - dashboard is ready" -ForegroundColor Green
    if (-not $NoBrowser) {
        Start-Process "http://localhost:3000"
    }
} else {
    $dashboardService = $services | Where-Object Name -eq "dashboard" | Select-Object -First 1
    Write-Host "  - dashboard did not respond; inspect $($dashboardService.StdErr)" -ForegroundColor DarkYellow
}

Write-Host "`nLogs: $logDir" -ForegroundColor Cyan
foreach ($service in $services) {
    Write-Host "  - $($service.Name): $($service.StdOut) | $($service.StdErr)" -ForegroundColor DarkGray
}
Write-Host "`nServices are running. Press Ctrl+C or run stop-f1-dash.bat to stop all." -ForegroundColor Cyan

try {
    while ($true) {
        Start-Sleep -Seconds 2
        if (Test-LauncherStopRequested -Path $stopRequestPath) {
            break
        }
        foreach ($service in $services) {
            if (-not (Get-Process -Id $service.ProcessId -ErrorAction SilentlyContinue)) {
                Write-Host "`n$($service.Name) exited unexpectedly. Inspect $($service.StdErr)" -ForegroundColor Red
                throw "$($service.Name) service exited"
            }
        }
    }
} finally {
    Write-Host "`nStopping f1-dash services ..." -ForegroundColor Yellow
    foreach ($service in $services) {
        Stop-ProcessTree -RootProcessId ([int]$service.ProcessId)
    }
    Clear-LauncherStopRequest -Path $stopRequestPath
    Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped." -ForegroundColor Cyan
}
