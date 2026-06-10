<#
.SYNOPSIS
    Stops all f1-dash local services by freeing the ports they use.
#>
$ports = 3000, 4000, 4001, 8000
Write-Host "Stopping f1-dash services on ports $($ports -join ', ') ..." -ForegroundColor Yellow
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
