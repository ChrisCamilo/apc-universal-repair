# Turns off the API that start-server.ps1 started, in a window or in the background. It stops the scheduled task,
# which stays registered (it starts again at the next sign-in, or with Start-ScheduledTask), and ends start-server.ps1
# with everything it started. Stopping the task alone isn't enough: Windows ends only the task's first process, and the
# API would keep running. A normal user may run it. See docs/home-server.md.

$ErrorActionPreference = 'Stop'

# The task's name in the Task Scheduler, as install-task.ps1 registers it.
$TaskName = 'APC Universal Repair API'

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Stop-ScheduledTask -TaskName $TaskName
}
$servers = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" |
  Where-Object { $_.CommandLine -like '*start-server.ps1*' }
if (-not $servers) {
  Write-Host 'O servidor APC não está ligado.'
  exit 0
}
foreach ($server in $servers) {
  # /T ends the whole tree: pnpm, cmd and the API's node processes.
  taskkill.exe /PID $server.ProcessId /T /F | Out-Null
}
Write-Host 'Servidor APC desligado.'
