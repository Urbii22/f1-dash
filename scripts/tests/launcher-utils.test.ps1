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

Write-Host "launcher-utils tests passed" -ForegroundColor Green
