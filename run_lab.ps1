param(
    [ValidateSet('world', 'replay', 'mc', 'hunt', 'estimate', 'fix', 'export', 'mine', 'all')]
    [string]$Step = 'all',
    [string]$Hazard = 'hazard.json',
    [switch]$Quick
)

$ErrorActionPreference = 'Stop'
$reportLine = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'REPORT.md') -Encoding UTF8 -TotalCount 1
if ($reportLine -notmatch '^MSSV:\s*([A-Za-z0-9]+)\s*$') {
    throw 'Set MSSV on the first line of REPORT.md before running.'
}
$previousMssv = $env:LAB11_MSSV
$previousPythonEncoding = $env:PYTHONIOENCODING
try {
    $env:LAB11_MSSV = $Matches[1]
    $env:PYTHONIOENCODING = 'utf-8'
    $labArguments = @((Join-Path $PSScriptRoot 'run_all.py'), $Step, $Hazard)
    if ($Quick) { $labArguments += '--quick' }
    & python -u @labArguments
    if ($LASTEXITCODE -ne 0) { throw "Step $Step failed (exit $LASTEXITCODE)." }
} finally {
    $env:LAB11_MSSV = $previousMssv
    $env:PYTHONIOENCODING = $previousPythonEncoding
}
