# Registers the Task Scheduler task "APC Universal Repair API", which runs start-server.ps1 -Background: the API with no
# window, logging to apps/api/logs/api.log and starting again whenever it stops. It starts the task at once, so there is
# no need to sign out. Running it again replaces the task. Remove it with uninstall-task.ps1. See docs/home-server.md.
#
# As a normal user (the default) the task starts when this user signs in to Windows. With -AtStartup it starts with
# Windows, before anyone signs in; Windows only lets an administrator create such a task, so it must run in a
# PowerShell opened as administrator. Either way the task runs as this user.

param(
  # Starts the API with Windows, before anyone signs in, instead of when this user signs in. Needs administrator.
  [switch]$AtStartup
)

$ErrorActionPreference = 'Stop'

# The task's name in the Task Scheduler, also used by uninstall-task.ps1.
$TaskName = 'APC Universal Repair API'

$user = [Security.Principal.WindowsIdentity]::GetCurrent()
if ($AtStartup -and -not ([Security.Principal.WindowsPrincipal]$user).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host 'Para ligar o servidor junto com o Windows, abra o PowerShell como administrador e rode este script de novo.'
  Write-Host 'Sem -AtStartup, ele liga quando você entra no Windows e não precisa de administrador.'
  exit 1
}
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Write-Host 'O pnpm não foi encontrado. Instale o Node.js e rode "corepack enable" antes (veja docs/home-server.md).'
  exit 1
}

$script = Join-Path $PSScriptRoot 'start-server.ps1'
# conhost --headless keeps the console hidden, also where Windows Terminal is the default terminal.
$action = New-ScheduledTaskAction -Execute 'conhost.exe' `
  -Argument "--headless powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$script`" -Background" `
  -WorkingDirectory (Split-Path -Parent $PSScriptRoot)
# No time limit (the default stops a task after 3 days), on battery too, and one copy at a time.
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew
if ($AtStartup) {
  $trigger = New-ScheduledTaskTrigger -AtStartup
  # S4U runs as this user without a stored password, whether or not anyone is signed in.
  $principal = New-ScheduledTaskPrincipal -UserId $user.Name -LogonType S4U -RunLevel Limited
} else {
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $user.Name
  $principal = New-ScheduledTaskPrincipal -UserId $user.Name -LogonType Interactive -RunLevel Limited
}
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings `
  -Description 'Liga o servidor do APC Universal Repair em segundo plano (apps/api/scripts/start-server.ps1).' -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName

if ($AtStartup) {
  Write-Host "Tarefa ""$TaskName"" criada: o servidor liga junto com o Windows, antes de alguém entrar."
} else {
  Write-Host "Tarefa ""$TaskName"" criada: o servidor liga quando $($user.Name) entra no Windows."
}
Write-Host 'Ela já foi iniciada agora. O log fica em apps\api\logs\api.log.'
