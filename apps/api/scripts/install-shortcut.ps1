# Creates the "Ligar servidor APC" shortcut on the desktop of whoever runs it, with the APC brand mark as its icon. It
# opens start-server.cmd, which starts the API in its own window. A normal user may run it; it needs no administrator.
# Running it again replaces the shortcut. See docs/home-server.md.

$ErrorActionPreference = 'Stop'

$desktop = [Environment]::GetFolderPath('Desktop')
$path = Join-Path $desktop 'Ligar servidor APC.lnk'
$shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut($path)
$shortcut.TargetPath = Join-Path $PSScriptRoot 'start-server.cmd'
$shortcut.WorkingDirectory = Split-Path -Parent $PSScriptRoot
$shortcut.IconLocation = Join-Path $PSScriptRoot 'apc.ico'
$shortcut.Description = 'Liga o servidor do APC Universal Repair para o celular e o app do computador'
$shortcut.Save()
Write-Host "Atalho criado: $path"
