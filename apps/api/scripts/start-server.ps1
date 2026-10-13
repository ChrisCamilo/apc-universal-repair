# Starts the APC Universal Repair API on this computer, for the phone on the same Wi-Fi and the desktop app, through
# `pnpm run start:home` (migrations, then the API). It runs in this window, showing the API's logs, and closing the
# window turns the API off. When the API already answers on its port, it says so and doesn't start a second copy.
# With -Background, as the scheduled task from install-task.ps1 runs it, there is no window: the output goes to
# apps/api/logs/api.log (moved to api.old.log once it passes 10 MB), and the API starts again 10 seconds after it
# stops, e.g. when Postgres isn't up yet at startup.
# The port comes from PORT in apps/api/.env, 3333 when it isn't set. See docs/home-server.md.

param(
  # Runs without a window, logging to a file and starting the API again whenever it stops.
  [switch]$Background
)

$ErrorActionPreference = 'Stop'

# The apps/api folder, where the API's .env and package.json are.
$Api = Split-Path -Parent $PSScriptRoot
# Size past which the log is moved aside when the background API starts.
$LogLimitBytes = 10MB

<#
.SYNOPSIS
Reads the port the API listens on.
.OUTPUTS
PORT from apps/api/.env, or 3333 when it isn't set.
#>
function Get-ApiPort {
  $envFile = Join-Path $Api '.env'
  if (Test-Path $envFile) {
    $line = Select-String -Path $envFile -Pattern '^\s*PORT\s*=\s*"?(\d+)' | Select-Object -First 1
    if ($line) { return [int]$line.Matches[0].Groups[1].Value }
  }
  return 3333
}

<#
.SYNOPSIS
Runs the API with no window until something stops the task, logging to logs\api.log and starting it again after it
stops.
.PARAMETER Port
The port the API listens on.
#>
function Start-Background([int]$Port) {
  $logs = Join-Path $Api 'logs'
  New-Item -ItemType Directory -Force $logs | Out-Null
  $log = Join-Path $logs 'api.log'
  if ((Test-Path $log) -and (Get-Item $log).Length -gt $LogLimitBytes) {
    Move-Item -Force $log (Join-Path $logs 'api.old.log')
  }
  if (Test-Api $Port) {
    Add-Content -Encoding UTF8 $log "$(Get-Date -Format s) The API already answers on port $Port; not starting another."
    return
  }
  while ($true) {
    Add-Content -Encoding UTF8 $log "$(Get-Date -Format s) Starting the API."
    # Through cmd, so the API's output goes to the log as it is, stderr included.
    cmd.exe /c "pnpm run start:home >> `"$log`" 2>&1"
    Add-Content -Encoding UTF8 $log "$(Get-Date -Format s) The API stopped (exit code $LASTEXITCODE); starting it again in 10 s."
    Start-Sleep -Seconds 10
  }
}

<#
.SYNOPSIS
Tells whether the API already answers on this computer.
.PARAMETER Port
The port the API listens on.
.OUTPUTS
True when GET /health answers.
#>
function Test-Api([int]$Port) {
  try {
    Invoke-WebRequest "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 3 | Out-Null
    return $true
  } catch {
    return $false
  }
}

Set-Location $Api
$port = Get-ApiPort

if ($Background) {
  Start-Background $port
  exit 0
}
if (Test-Api $port) {
  Write-Host "O servidor APC já está ligado em http://localhost:$port."
  Read-Host 'Pressione Enter para fechar'
  exit 0
}
Write-Host 'Ligando o servidor APC. Para desligar, feche esta janela.'
Write-Host ''
pnpm run start:home
Write-Host ''
Write-Host 'O servidor APC parou.'
Read-Host 'Pressione Enter para fechar'
