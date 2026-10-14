param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$uiPidFile = Join-Path $PSScriptRoot '.ui_runtime/server.pid'
if (-not (Test-Path -LiteralPath $uiPidFile)) {
    Write-Output 'No tracked background server. Use Ctrl+C for a server started in a terminal.'
    return
}
$uiServerPid = [int](Get-Content -LiteralPath $uiPidFile -TotalCount 1)
$uiServer = Get-CimInstance Win32_Process -Filter "ProcessId = $uiServerPid"
if ($null -eq $uiServer) {
    Write-Output 'The tracked background server is already stopped.'
    return
}
$expectedScript = Join-Path $PSScriptRoot 'serve_ui.py'
if ($null -eq $uiServer.CommandLine -or $uiServer.CommandLine.IndexOf($expectedScript, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) {
    throw 'PID does not belong to this workspace server; no process was stopped.'
}
if ($CheckOnly) {
    Write-Output "Verified workspace background server PID: $uiServerPid"
    return
}
Stop-Process -Id $uiServerPid
Write-Output "Stopped Scenario Forge background server PID: $uiServerPid"
