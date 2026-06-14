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
