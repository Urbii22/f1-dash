$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "..\launcher-utils.ps1")

$dashboard = "D:\UTILS\CODEX\F1_DASH\dashboard"
$processes = @(
    [pscustomobject]@{
        ProcessId = 101
        Name = "node.exe"
        CommandLine = '"C:\Program Files\nodejs\node.exe" "D:\UTILS\CODEX\F1_DASH\dashboard\node_modules\next\dist\bin\next" dev -p 3001'
    },
    [pscustomobject]@{
        ProcessId = 102
        Name = "node.exe"
        CommandLine = '"C:\Program Files\nodejs\node.exe" D:\UTILS\CODEX\F1_DASH\dashboard\node_modules\next\dist\server\lib\start-server.js'
    },
    [pscustomobject]@{
        ProcessId = 103
        Name = "node.exe"
        CommandLine = '"C:\Program Files\nodejs\node.exe" D:\OTHER\dashboard\node_modules\next\dist\bin\next dev'
    },
    [pscustomobject]@{
        ProcessId = 104
        Name = "powershell.exe"
        CommandLine = 'powershell -File D:\UTILS\CODEX\F1_DASH\scripts\start-all.ps1'
    }
)

$actual = @(Get-DashboardDevProcessIds -Processes $processes -DashboardDir $dashboard)
$expected = @(101, 102)

if (($actual -join ',') -ne ($expected -join ',')) {
    throw "Expected dashboard process IDs '$($expected -join ',')', got '$($actual -join ',')'."
}

$logPaths = Get-ServiceLogPaths -LogDir "D:\logs" -ServiceName "dashboard"
if ($logPaths.StdOut -ne "D:\logs\dashboard.log" -or $logPaths.StdErr -ne "D:\logs\dashboard.err.log") {
    throw "Unexpected service log paths: $($logPaths | ConvertTo-Json -Compress)"
}

$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("f1-dash-launcher-test-" + [guid]::NewGuid())
$statePath = Join-Path $tempDir "launcher-state.json"
$state = [pscustomobject]@{
    LauncherPid = 50
    Services = @(
        [pscustomobject]@{ Name = "api"; ProcessId = 201 },
        [pscustomobject]@{ Name = "dashboard"; ProcessId = 202 }
    )
}

try {
    Write-LauncherState -Path $statePath -State $state
    $loaded = Read-LauncherState -Path $statePath
    if ($loaded.LauncherPid -ne 50 -or $loaded.Services.Count -ne 2 -or $loaded.Services[1].ProcessId -ne 202) {
        throw "Runtime state did not round-trip."
    }
} finally {
    Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

$stopRequestPath = Join-Path ([System.IO.Path]::GetTempPath()) ("f1-dash-stop-" + [guid]::NewGuid())
try {
    if (Test-LauncherStopRequested -Path $stopRequestPath) {
        throw "Stop request should not exist before it is created."
    }
    Request-LauncherStop -Path $stopRequestPath
    if (-not (Test-LauncherStopRequested -Path $stopRequestPath)) {
        throw "Stop request was not detected."
    }
    Clear-LauncherStopRequest -Path $stopRequestPath
    if (Test-LauncherStopRequested -Path $stopRequestPath) {
        throw "Stop request was not cleared."
    }
} finally {
    Remove-Item -LiteralPath $stopRequestPath -Force -ErrorAction SilentlyContinue
}

$treeProcesses = @(
    [pscustomobject]@{ ProcessId = 201; ParentProcessId = 50 },
    [pscustomobject]@{ ProcessId = 202; ParentProcessId = 201 },
    [pscustomobject]@{ ProcessId = 203; ParentProcessId = 202 },
    [pscustomobject]@{ ProcessId = 999; ParentProcessId = 1 }
)
$tree = @(Get-ProcessTreeIds -RootProcessId 201 -Processes $treeProcesses)
if (($tree -join ',') -ne '203,202,201') {
    throw "Expected child-first process tree '203,202,201', got '$($tree -join ',')'."
}

$legacyProcesses = @(
    [pscustomobject]@{
        ProcessId = 301
        Name = "powershell.exe"
        CommandLine = "powershell -NoExit -Command `$host.UI.RawUI.WindowTitle = 'f1-dash api :4001'; & 'D:\UTILS\CODEX\F1_DASH\target\debug\api.exe'"
    },
    [pscustomobject]@{
        ProcessId = 302
        Name = "powershell.exe"
        CommandLine = "powershell -NoExit -Command `$host.UI.RawUI.WindowTitle = 'other project';"
    }
)
$legacyIds = @(Get-LegacyServiceWindowProcessIds -Processes $legacyProcesses -RootDir "D:\UTILS\CODEX\F1_DASH")
if (($legacyIds -join ',') -ne '301') {
    throw "Expected legacy service window PID '301', got '$($legacyIds -join ',')'."
}

Write-Host "launcher-utils tests passed" -ForegroundColor Green
