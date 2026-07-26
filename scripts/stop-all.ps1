<#
.SYNOPSIS
    Stops all f1-dash local services by freeing the ports they use.
#>
$Root = Split-Path -Parent $PSScriptRoot
$statePath = Join-Path $Root ".runtime\launcher-state.json"

. (Join-Path $PSScriptRoot "launcher-utils.ps1")

Write-Host "Stopping f1-dash services ..." -ForegroundColor Yellow
$state = Read-LauncherState -Path $statePath
if ($state) {
    $stopRequestPath = if ($state.StopRequestPath) {
        [string]$state.StopRequestPath
    } else {
        Join-Path $Root ".runtime\stop-requested"
    }
    Write-Host "  - requesting graceful supervisor shutdown" -ForegroundColor DarkGray
    Request-LauncherStop -Path $stopRequestPath

    if ($state.LauncherPid -and [int]$state.LauncherPid -ne $PID) {
        $launcherPid = [int]$state.LauncherPid
        for ($i = 0; $i -lt 30; $i++) {
            if (-not (Get-Process -Id $launcherPid -ErrorAction SilentlyContinue)) {
                break
            }
            Start-Sleep -Milliseconds 500
        }
        if (Get-Process -Id $launcherPid -ErrorAction SilentlyContinue) {
            Write-Host "  - supervisor did not exit; forcing PID $launcherPid" -ForegroundColor DarkYellow
            Stop-Process -Id $launcherPid -Force -ErrorAction SilentlyContinue
        }
    }

    foreach ($service in @($state.Services)) {
        Stop-ProcessTree -RootProcessId ([int]$service.ProcessId)
    }
    Clear-LauncherStopRequest -Path $stopRequestPath
    Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
}

$legacyWindows = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue
$legacyWindowIds = @(Get-LegacyServiceWindowProcessIds -Processes $legacyWindows -RootDir $Root)
foreach ($processId in $legacyWindowIds) {
    Write-Host "  - closing legacy service window PID $processId" -ForegroundColor DarkGray
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}

$ports = 3000, 4000, 4001, 8000
Write-Host "Checking fallback ports $($ports -join ', ') ..." -ForegroundColor Yellow
foreach ($port in $ports) {
    try {
        $owners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop |
            Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($processId in $owners) {
            Write-Host "  - stopping PID $processId on port $port" -ForegroundColor DarkGray
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Host "  - nothing listening on port $port" -ForegroundColor DarkGray
    }
}
Write-Host "Done." -ForegroundColor Cyan
