---
name: apc-installer
description: Change the APC Universal Repair Windows installer or uninstaller pages (apps/desktop/build/installer.nsh, NSIS, electron-builder), or test install, update and uninstall. Use for any APC installer, NSIS page or setup change.
---

# Changing the APC installer

AGENTS.md "Windows installer (NSIS)" is the source of truth. NSIS drops text without a warning, so a passing build proves nothing about the page.

## Writing the page

- **Quotes inside a text:** single-quote the string (`'Veja "Trocar de banco de dados" no guia.'`) or escape each quote as `$\"`. Never `""`: NSIS ends the string there and drops the rest.
- **Encoding:** keep `installer.nsh` UTF-8 with a BOM, or the accents break.
- **Room:** a custom page's controls end by 114u; past about 120u the page cuts them.
- **Text in Portuguese,** as the rest of the installer.

## Testing it safely

Install tests run on the user's real Windows, where the installed APC holds real data in `%APPDATA%\APC Universal Repair`.

1. Before anything, tell the user the risks and get a yes.
2. Back up that folder and record hashes of its files.
3. Build the test installer under another `appId`, so it never touches the installed app.
4. Look at every page the change touches on a **fresh install** (an install over the app skips them), and on uninstall when it changes.
5. Take a screenshot of each page for the PR.
6. Afterwards, check the backup's hashes still match the real data.
