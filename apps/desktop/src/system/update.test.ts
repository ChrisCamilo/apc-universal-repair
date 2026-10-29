import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  checksForUpdates,
  clearInstallMarker,
  INSTALL_MARKER,
  INSTALL_WINDOW_MS,
  installInProgress,
  readInstallMarker,
  RESTART_INSTALL,
  RESTART_TO_UPDATE_CHANNEL,
  serverVersionWarning,
  UPDATE_READY_CHANNEL,
  writeInstallMarker,
} from "./update.ts";

/** The installer's own script, with the pages and macros electron-builder inserts into its installer and uninstaller. */
const INSTALLER_SCRIPT = readFileSync(path.join(import.meta.dirname, "..", "..", "build", "installer.nsh"), "utf8");

/**
 * Reads one macro of the installer's script, matched by its exact name.
 * @param name The macro's name, e.g. "customInstall".
 * @returns Its text, from `!macro` to its `!macroend`.
 */
function installerMacro(name: string): string {
  const start = INSTALLER_SCRIPT.search(new RegExp(`!macro ${name}\\r?\\n`));
  return INSTALLER_SCRIPT.slice(start, INSTALLER_SCRIPT.indexOf("!macroend", start));
}

// Checks only the installed app looks for updates: packaged, with no dev server and not as the portable exe.
test("Desktop: only the installed app checks for updates", () => {
  const installed = { isPackaged: true, devUrl: undefined, portableDir: undefined };
  assert.equal(checksForUpdates(installed), true);
  assert.equal(checksForUpdates({ ...installed, isPackaged: false }), false);
  assert.equal(checksForUpdates({ ...installed, devUrl: "http://localhost:5173" }), false);
  assert.equal(checksForUpdates({ ...installed, portableDir: "C:\\Users\\apc\\Downloads" }), false);
});

// The sandboxed preload can't import update.ts, so it writes the channels itself; checks they are the same.
test("Desktop: the preload uses the same update channels as the main process", () => {
  const preload = readFileSync(path.join(import.meta.dirname, "..", "preload.cts"), "utf8");
  assert.ok(preload.includes(`"${RESTART_TO_UPDATE_CHANNEL}"`));
  assert.ok(preload.includes(`"${UPDATE_READY_CHANNEL}"`));
});

// Writes the marker of an update to 0.5.2 and checks an app of 0.5.1 opening in the next minutes leaves the folder to
// the installer, but not 0.5.2 itself, nor any app once the install window has passed, nor one with no marker.
test("Desktop: an app opened while its update installs leaves it to the installer", () => {
  const startedAt = Date.parse("2026-10-21T12:00:00Z");
  const marker = { version: "0.5.2", startedAt, reopens: true };
  assert.equal(installInProgress(marker, "0.5.1", startedAt + 20_000), true);
  assert.equal(installInProgress(marker, "0.5.2", startedAt + 20_000), false);
  assert.equal(installInProgress(marker, "0.5.1", startedAt + INSTALL_WINDOW_MS), false);
  assert.equal(installInProgress(undefined, "0.5.1", startedAt), false);
});

// Writes the marker, reads it back and clears it, and checks a marker that isn't JSON or lacks its fields reads as none.
test("Desktop: the update's marker is kept in userData until it is cleared", () => {
  const userData = mkdtempSync(path.join(tmpdir(), "apc-update-"));
  try {
    const marker = { version: "0.5.2", startedAt: 1_792_000_000_000, reopens: false };
    writeInstallMarker(userData, marker);
    assert.deepEqual(readInstallMarker(userData), marker);
    clearInstallMarker(userData);
    assert.equal(readInstallMarker(userData), undefined);
    writeFileSync(path.join(userData, INSTALL_MARKER), "{ quebrado");
    assert.equal(readInstallMarker(userData), undefined);
    writeFileSync(path.join(userData, INSTALL_MARKER), '{ "version": "0.5.2" }');
    assert.equal(readInstallMarker(userData), undefined);
  } finally {
    rmSync(userData, { recursive: true, force: true });
  }
});

// Checks the warning names both versions, or says the server is older than 0.2.0 when it answers none.
test("Desktop: the warning about a remote server names both versions", () => {
  assert.equal(
    serverVersionWarning("0.2.1", "0.2.0"),
    "O servidor APC está na versão 0.2.0, e este app na 0.2.1. Atualize o servidor no computador onde ele roda para evitar erros.",
  );
  assert.match(serverVersionWarning("0.2.1", undefined), /numa versão anterior à 0\.2\.0, e este app na 0\.2\.1/);
});

// Checks *Reiniciar agora* runs the installer with its window, so its progress shows, and starts the new version after.
test("Desktop: restarting to update shows the installer and opens the new version", () => {
  assert.deepEqual(RESTART_INSTALL, { silent: false, runAfter: true });
});

// Reads the installer's own script and checks its update macros act only on an update (isUpdated): the install mode
// kept, the progress page saying it is updating and the finish page skipped, which keeps its run checkbox otherwise;
// that the progress bar is filled once the files are in, and that none of them removes a file or the app's data.
test("Desktop: the installer asks nothing more on an update, and removes nothing", () => {
  const mode = installerMacro("customInstallMode");
  assert.match(mode, /\$\{If\} \$\{isUpdated\}[\s\S]*isForceCurrentInstall[\s\S]*isForceMachineInstall/);
  const finish = installerMacro("customFinishPage");
  assert.match(finish, /Function finishPagePre\s+\$\{If\} \$\{isUpdated\}\s+Call startAppAfterFinish\s+Abort/);
  assert.match(finish, /MUI_FINISHPAGE_RUN_FUNCTION startAppAfterFinish[\s\S]*MUI_PAGE_FINISH/);
  const pages = installerMacro("customPageAfterChangeDir");
  assert.match(pages, /MUI_PAGE_CUSTOMFUNCTION_SHOW instFilesShow[\s\S]*\$\{If\} \$\{isUpdated\}\s+!insertmacro MUI_HEADER_TEXT "Atualizando o APC"/);
  const install = installerMacro("customInstall");
  assert.match(install, /\$\{IfNot\} \$\{Silent\}[\s\S]*PBM_SETRANGE32\} 0 1[\s\S]*PBM_SETPOS\} 1 0/);
  for (const text of [mode, finish, pages, install]) {
    assert.doesNotMatch(text, /\bDelete\b|\bRMDir\b|delete-app-data/);
  }
});

// Reads the installer's own script and checks the uninstaller's page about the data shows on a real uninstall only,
// not a silent one nor an update, keeps the data by default and asks again before deleting it; and that the script's
// one removal is of the app's own userData folder, once deleting was confirmed, outside a silent uninstall or update.
test("Desktop: the uninstaller asks whether to keep the data, and deletes only the app's folder", () => {
  const page = installerMacro("customUnWelcomePage");
  assert.match(page, /Function un\.dataPageCreate\s+\$\{If\} \$\{Silent\}\s+\$\{OrIf\} \$\{isUpdated\}\s+Abort/);
  assert.match(page, /ReadEnvStr \$R1 APPDATA[\s\S]*StrCpy \$dataFolder "\$R1\\\$\{PRODUCT_NAME\}"/);
  assert.match(page, /\$\{If\} \$dataChoice == delete\s+\$\{NSD_Check\} \$dataDelete\s+\$\{Else\}\s+\$\{NSD_Check\} \$dataKeep/);
  assert.match(page, /MB_DEFBUTTON2 \$R1 IDYES \+2\s+Abort\s+StrCpy \$dataChoice delete/);
  const uninstall = installerMacro("customUnInstall");
  assert.match(uninstall, /\$\{If\} \$dataChoice == delete\s+\$\{AndIfNot\} \$\{Silent\}\s+\$\{AndIfNot\} \$\{isUpdated\}[\s\S]*RMDir \/r "\$dataFolder"/);
  assert.deepEqual(INSTALLER_SCRIPT.match(/\bDelete\b|\bRMDir\b|delete-app-data/g), ["RMDir"]);
});
