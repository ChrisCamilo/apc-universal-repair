import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { APP_USER_MODEL_ID, DEV_APP_USER_MODEL_ID, windowsIdentity } from "./identity.ts";

/** The desktop app's folder. */
const APP_DIR = path.join(import.meta.dirname, "..");

// Checks the packaged app uses the installer's id and its own exe's icon, and a run from the clone an id of its own and
// build/icon.ico, so the shortcut Electron makes for a run from the clone never takes the installed app's taskbar icon.
test("Desktop: a run from the clone has its own id, and each run names the APC icon", () => {
  const exe = String.raw`C:\Users\apc\AppData\Local\Programs\APC Universal Repair\APC Universal Repair.exe`;
  assert.deepEqual(windowsIdentity({ isPackaged: true, execPath: exe, appPath: String.raw`C:\apc\resources\app.asar` }), { appId: APP_USER_MODEL_ID, iconPath: exe, iconIndex: 0 });
  assert.deepEqual(windowsIdentity({ isPackaged: false, execPath: String.raw`C:\repo\electron.exe`, appPath: String.raw`C:\repo\apps\desktop` }), {
    appId: DEV_APP_USER_MODEL_ID,
    iconPath: String.raw`C:\repo\apps\desktop\build\icon.ico`,
    iconIndex: 0,
  });
  assert.notEqual(DEV_APP_USER_MODEL_ID, APP_USER_MODEL_ID);
});

// Checks the installed app's id is the installer's appId, which its Start menu and desktop shortcuts carry.
test("Desktop: the installed app's id is the installer's appId", () => {
  const builder = readFileSync(path.join(APP_DIR, "electron-builder.yml"), "utf8");
  assert.ok(builder.split(/\r?\n/).includes(`appId: ${APP_USER_MODEL_ID}`));
});

// Reads build/icon.ico's directory and checks it holds every size Windows asks for, 16 to 256px, each square.
test("Desktop: the app's icon holds every size Windows asks for", () => {
  const icon = readFileSync(path.join(APP_DIR, "build", "icon.ico"));
  assert.deepEqual([icon.readUInt16LE(0), icon.readUInt16LE(2)], [0, 1]);
  const sizes = Array.from({ length: icon.readUInt16LE(4) }, (_, index) => {
    const entry = 6 + index * 16;
    // 0 stands for 256.
    const [width, height] = [icon[entry] || 256, icon[entry + 1] || 256];
    assert.equal(width, height);
    return width;
  });
  assert.deepEqual(sizes, [16, 24, 32, 48, 64, 128, 256]);
});
