@echo off
rem "Ligar servidor APC": starts the API in this window through start-server.ps1; closing the window turns it off.
rem The desktop shortcut from install-shortcut.ps1 opens this file, and a double-click on it works the same.
title Servidor APC Universal Repair
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"
