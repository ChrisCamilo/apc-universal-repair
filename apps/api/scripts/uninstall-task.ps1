# Turns the background API off through stop-server.ps1 and removes the "APC Universal Repair API" task that
# install-task.ps1 registered. A task made with -AtStartup can only be removed from a PowerShell opened as
# administrator. See docs/home-server.md.

$ErrorActionPreference = 'Stop'

# The task's name in the Task Scheduler, as install-task.ps1 registers it.
$TaskName = 'APC Universal Repair API'

if (-not (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue)) {
  Write-Host "A tarefa ""$TaskName"" não existe; não há nada para remover."
  exit 0
}
& (Join-Path $PSScriptRoot 'stop-server.ps1')
try {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
} catch {
  Write-Host 'Não foi possível remover a tarefa. Se ela liga junto com o Windows, abra o PowerShell como administrador e rode este script de novo.'
  exit 1
}
Write-Host "Tarefa ""$TaskName"" removida."
