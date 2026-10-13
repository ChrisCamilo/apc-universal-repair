# Starts the APC Universal Repair API on this computer, for the phone on the same Wi-Fi and the desktop app, through
# `pnpm run start:home` (migrations, then the API). It runs in this window, showing the API's logs, and closing the
# window turns the API off. When the API already answers on its port, it says so and doesn't start a second copy.
# The port comes from PORT in apps/api/.env, 3333 when it isn't set. See docs/home-server.md.

$ErrorActionPreference = 'Stop'

# The apps/api folder, where the API's .env and package.json are.
$Api = Split-Path -Parent $PSScriptRoot

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
