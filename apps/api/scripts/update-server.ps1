# Brings the server at home to a release of APC Universal Repair: turns the API off, checks the clone out at the tag
# v<version>, installs its dependencies and turns the API back on, which applies the migrations (start:home). The
# desktop app runs it when /health answers a version other than its own; it can also be run by hand. A normal user may
# run it.
#
# It refuses to run when the clone has local changes, and when the tag doesn't exist. When a step fails, or the API
# doesn't answer the new version in time, it goes back to the commit it was on and turns the API on again. It turns the
# API on through the scheduled task from install-task.ps1 when it is installed, otherwise in the background as the
# desktop app does. What it does goes to apps/api/logs/update.log. See docs/home-server.md.

param(
  # The release to bring the server to, e.g. 0.2.0, for the tag v0.2.0.
  [Parameter(Mandatory)]
  [ValidatePattern('^\d+\.\d+\.\d+$')]
  [string]$Version
)

$ErrorActionPreference = 'Stop'

# The apps/api folder, where the API's .env and package.json are.
$Api = Split-Path -Parent $PSScriptRoot
# The task's name in the Task Scheduler, as install-task.ps1 registers it.
$TaskName = 'APC Universal Repair API'
# How long to wait for the API to answer the new version: installing, generating and migrating take a while.
$UpdateTimeoutSeconds = 300

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
Runs a command line tool in the clone and throws when it fails.
.PARAMETER Command
The tool, e.g. git.
.PARAMETER Arguments
Its arguments.
#>
function Invoke-Step([string]$Command, [string[]]$Arguments) {
  # git and pnpm write progress and warnings to stderr, which Windows PowerShell would take as an error.
  $ErrorActionPreference = 'Continue'
  Write-Log "$Command $($Arguments -join ' ')"
  & $Command @Arguments 2>&1 | ForEach-Object { Add-Content -Encoding UTF8 $script:Log "  $_" }
  if ($LASTEXITCODE -ne 0) {
    throw "$Command $($Arguments -join ' ') failed (exit code $LASTEXITCODE)."
  }
}

<#
.SYNOPSIS
Turns the API on: through the scheduled task when it is installed, otherwise in the background, with no window.
#>
function Start-Server {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Write-Log 'Starting the scheduled task.'
    Start-ScheduledTask -TaskName $TaskName
    return
  }
  Write-Log 'Starting the API in the background.'
  $script = Join-Path $PSScriptRoot 'start-server.ps1'
  Start-Process conhost.exe -WorkingDirectory $Api -ArgumentList "--headless powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$script`" -Background"
}

<#
.SYNOPSIS
Waits for the API to answer a version on /health.
.PARAMETER Expected
The version to wait for.
.PARAMETER Seconds
How long to wait; 0 asks once.
.OUTPUTS
True once it answers that version, false when the time is up.
#>
function Wait-ApiVersion([string]$Expected, [int]$Seconds) {
  $port = Get-ApiPort
  $deadline = (Get-Date).AddSeconds($Seconds)
  do {
    try {
      $health = Invoke-RestMethod "http://127.0.0.1:$port/health" -TimeoutSec 3
      if ($health.version -eq $Expected) { return $true }
    } catch {
      # Not up yet.
    }
    if ($Seconds -gt 0) { Start-Sleep -Seconds 2 }
  } while ((Get-Date) -lt $deadline)
  return $false
}

<#
.SYNOPSIS
Adds a line, with the time, to logs\update.log.
.PARAMETER Message
What to write.
#>
function Write-Log([string]$Message) {
  Add-Content -Encoding UTF8 $script:Log "$(Get-Date -Format s) $Message"
}

Set-Location $Api
$logs = Join-Path $Api 'logs'
New-Item -ItemType Directory -Force $logs | Out-Null
$script:Log = Join-Path $logs 'update.log'
Write-Log "Updating the server to v$Version."

$changes = git status --porcelain
if ($changes) {
  Write-Log 'Refused: the clone has local changes.'
  Write-Host 'O clone do projeto tem alterações locais, então o servidor não foi atualizado. Desfaça ou salve as alterações e tente de novo.'
  exit 1
}
try {
  Invoke-Step git @('fetch', '--tags', '--quiet')
} catch {
  # Without internet the tag may already be here.
  Write-Log "Couldn't fetch the tags: $_"
}
git rev-parse --quiet --verify "refs/tags/v$Version" | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Log "Refused: there is no tag v$Version."
  Write-Host "A versão v$Version não existe, então o servidor não foi atualizado."
  exit 1
}
$previous = (git rev-parse HEAD).Trim()
if ($previous -eq (git rev-parse "v$Version^{commit}").Trim() -and (Wait-ApiVersion $Version 0)) {
  Write-Log "Already on v$Version."
  exit 0
}

& (Join-Path $PSScriptRoot 'stop-server.ps1') | Out-Null
try {
  Invoke-Step git @('checkout', '--quiet', "v$Version")
  Invoke-Step pnpm @('install', '--frozen-lockfile')
  Start-Server
  if (-not (Wait-ApiVersion $Version $UpdateTimeoutSeconds)) {
    throw "The API didn't answer v$Version in $UpdateTimeoutSeconds s."
  }
  Write-Log "Updated to v$Version."
  Write-Host "Servidor APC atualizado para a versão $Version."
} catch {
  Write-Log "Failed: $_ Going back to $previous."
  & (Join-Path $PSScriptRoot 'stop-server.ps1') | Out-Null
  try {
    Invoke-Step git @('checkout', '--quiet', $previous)
    Invoke-Step pnpm @('install', '--frozen-lockfile')
  } catch {
    Write-Log "Going back failed too: $_"
  }
  Start-Server
  Write-Host "Não foi possível atualizar o servidor para a versão $Version; ele voltou para a versão anterior. Veja apps/api/logs/update.log."
  exit 1
}
