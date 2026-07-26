function Get-DashboardDevProcessIds {
    param(
        [Parameter(Mandatory = $true)]
        [object[]]$Processes,

        [Parameter(Mandatory = $true)]
        [string]$DashboardDir
    )

    $dashboardPath = [System.IO.Path]::GetFullPath($DashboardDir).TrimEnd('\')

    foreach ($process in $Processes) {
        if ($process.Name -ne "node.exe" -or -not $process.CommandLine) {
            continue
        }

        $commandLine = [string]$process.CommandLine
        $belongsToDashboard = $commandLine.IndexOf($dashboardPath, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
        $isNextRuntime = $commandLine.IndexOf("\node_modules\next\dist\", [System.StringComparison]::OrdinalIgnoreCase) -ge 0

        if ($belongsToDashboard -and $isNextRuntime) {
            [int]$process.ProcessId
        }
    }
}

function Get-LegacyServiceWindowProcessIds {
    param(
        [Parameter(Mandatory = $true)]
        [object[]]$Processes,

        [Parameter(Mandatory = $true)]
        [string]$RootDir
    )

    $rootPath = [System.IO.Path]::GetFullPath($RootDir).TrimEnd('\')
    foreach ($process in $Processes) {
        if ($process.Name -ne "powershell.exe" -or -not $process.CommandLine) {
            continue
        }

        $commandLine = [string]$process.CommandLine
        $belongsToProject = $commandLine.IndexOf($rootPath, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
        $hasLegacyTitle = $commandLine.IndexOf("WindowTitle = 'f1-dash", [System.StringComparison]::OrdinalIgnoreCase) -ge 0
        if ($belongsToProject -and $hasLegacyTitle) {
            [int]$process.ProcessId
        }
    }
}

function Get-ServiceLogPaths {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LogDir,

        [Parameter(Mandatory = $true)]
        [string]$ServiceName
    )

    [pscustomobject]@{
        StdOut = Join-Path $LogDir "$ServiceName.log"
        StdErr = Join-Path $LogDir "$ServiceName.err.log"
    }
}

function Write-LauncherState {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [object]$State
    )

    $directory = Split-Path -Parent $Path
    if ($directory) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }
    $State | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Read-LauncherState {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    try {
        Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    } catch {
        return $null
    }
}

function Request-LauncherStop {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $directory = Split-Path -Parent $Path
    if ($directory) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }
    Set-Content -LiteralPath $Path -Value (Get-Date).ToString("o") -Encoding ASCII
}

function Test-LauncherStopRequested {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    Test-Path -LiteralPath $Path
}

function Clear-LauncherStopRequest {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
}

function Get-ProcessTreeIds {
    param(
        [Parameter(Mandatory = $true)]
        [int]$RootProcessId,

        [Parameter(Mandatory = $true)]
        [object[]]$Processes
    )

    $children = @{}
    foreach ($process in $Processes) {
        $parentId = [int]$process.ParentProcessId
        if (-not $children.ContainsKey($parentId)) {
            $children[$parentId] = @()
        }
        $children[$parentId] += [int]$process.ProcessId
    }

    function Add-ProcessTreeIds([int]$ProcessId) {
        if ($children.ContainsKey($ProcessId)) {
            foreach ($childId in @($children[$ProcessId])) {
                Add-ProcessTreeIds -ProcessId $childId
            }
        }
        $ProcessId
    }

    Add-ProcessTreeIds -ProcessId $RootProcessId
}

function Stop-ProcessTree {
    param(
        [Parameter(Mandatory = $true)]
        [int]$RootProcessId
    )

    $processes = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)
    $processIds = @(Get-ProcessTreeIds -RootProcessId $RootProcessId -Processes $processes)
    foreach ($processId in $processIds) {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
}
