import assert from "node:assert/strict";
import { test } from "node:test";
import { LOCALES as SHARED_LOCALES } from "@apc/domain/locale";
import { DESKTOP_TEXTS, isLocale, language, LOCALES, setLanguage, texts } from "./texts.ts";

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
