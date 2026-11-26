import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { LOCALES as SHARED_LOCALES } from "@apc/domain/locale";
import { readConfig, writeConfig } from "./config.ts";
import { adoptInstallerLanguage, DESKTOP_TEXTS, INSTALLER_LANGUAGE_FILE, isLocale, language, LOCALES, setLanguage, texts } from "./texts.ts";

/** userData folders of this run, removed at the end. */
const folders: string[] = [];

after(() => folders.forEach((folder) => rmSync(folder, { recursive: true, force: true })));

/**
 * Makes an empty userData folder for one test.
 * @returns Its path.
 */
function userDataFolder(): string {
  const folder = mkdtempSync(path.join(tmpdir(), "apc-texts-"));
  folders.push(folder);
  return folder;
}

/**
 * Lists a catalog's texts by their path, each with what it is: a text, a function with its number of arguments, or a
 * list with its length.
 * @param value The catalog, or a part of it.
 * @param at The path to it.
 * @returns E.g. ["tray.open: string", "tray.address: function/1"].
 */
function shapeOf(value: unknown, at = ""): string[] {
  if (typeof value === "function") {
    return [`${at}: function/${value.length}`];
  }
  if (Array.isArray(value)) {
    return [`${at}: list/${value.length}`];
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, part]) => shapeOf(part, at ? `${at}.${key}` : key));
  }
  return [`${at}: ${typeof value}`];
}

// The main process writes its own copy of the languages, since the packaged app doesn't carry @apc/domain; checks it
// has the same ones as the page.
test("Desktop: the main process knows the same languages as the page", () => {
  assert.deepEqual(LOCALES, SHARED_LOCALES);
  assert.deepEqual([isLocale("en-US"), isLocale("pt-BR"), isLocale("es-ES"), isLocale(undefined)], [true, true, false, false]);
});

// Checks the English texts have every text the Portuguese have, each of the same kind, so no dialog lacks a text in
// either language.
test("Desktop: every text of the main process is written in both languages", () => {
  assert.deepEqual(shapeOf(DESKTOP_TEXTS["en-US"]), shapeOf(DESKTOP_TEXTS["pt-BR"]));
});

// Checks the main process writes in Portuguese until the page says another language, and then in that one.
test("Desktop: the main process writes in Portuguese until the page chooses English", (t) => {
  assert.equal(language(), "pt-BR");
  assert.equal(texts().tray.quit, "Sair");
  setLanguage("en-US");
  t.after(() => setLanguage("pt-BR"));
  assert.equal(texts().tray.quit, "Quit");
});

// Leaves English from the installer in a fresh userData and checks the app takes it into config.json, removing the
// installer's file; with config.json keeping a language already, the installer's is dropped and the kept one stays;
// without either, the app is in Portuguese; and a file that isn't a language is dropped.
test("Desktop: the app starts in the language chosen at install, until it keeps its own", () => {
  const fresh = userDataFolder();
  writeFileSync(path.join(fresh, INSTALLER_LANGUAGE_FILE), "en-US");
  assert.equal(adoptInstallerLanguage(fresh), "en-US");
  assert.equal(readConfig(fresh).locale, "en-US");
  assert.equal(existsSync(path.join(fresh, INSTALLER_LANGUAGE_FILE)), false);
  assert.equal(adoptInstallerLanguage(fresh), "en-US");

  const kept = userDataFolder();
  writeConfig(kept, { locale: "pt-BR" });
  writeFileSync(path.join(kept, INSTALLER_LANGUAGE_FILE), "en-US");
  assert.equal(adoptInstallerLanguage(kept), "pt-BR");
  assert.equal(existsSync(path.join(kept, INSTALLER_LANGUAGE_FILE)), false);

  assert.equal(adoptInstallerLanguage(userDataFolder()), "pt-BR");
  const odd = userDataFolder();
  writeFileSync(path.join(odd, INSTALLER_LANGUAGE_FILE), "es-ES");
  assert.equal(adoptInstallerLanguage(odd), "pt-BR");
  assert.equal(readConfig(odd).locale, undefined);
});
