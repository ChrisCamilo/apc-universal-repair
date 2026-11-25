import assert from "node:assert/strict";
import { test } from "node:test";
import { formatPrice } from "../../inventory/items.ts";
import { catalog, DEFAULT_LOCALE, formatDateTime, formatNumber, isLocale, LOCALE_NAMES, LOCALES } from "./locale.ts";

// Checks the apps speak Portuguese and English, start in Portuguese, and offer each language by its own name.
test("Shared: the apps speak Portuguese and English, Portuguese first", () => {
  assert.deepEqual(LOCALES, ["pt-BR", "en-US"]);
  assert.equal(DEFAULT_LOCALE, "pt-BR");
  assert.deepEqual(LOCALE_NAMES, { "pt-BR": "Português", "en-US": "English" });
});

// Checks only the two languages pass as one, so a value read back from storage that isn't one falls back to Portuguese.
test("Shared: only the apps' languages are read back as a language", () => {
  assert.deepEqual(["pt-BR", "en-US", "en", "pt", "fr-FR", null, undefined].map(isLocale), [true, true, false, false, false, false, false]);
});

// Builds a catalog with a message that depends on a value, and checks each language writes its own plural.
test("Shared: a catalog holds each language's texts, its messages writing their own plural", () => {
  const items = catalog(
    { count: (count: number) => (count === 1 ? "1 item" : `${count} itens`) },
    { count: (count) => (count === 1 ? "1 item" : `${count} items`) },
  );
  assert.deepEqual([items["pt-BR"].count(1), items["pt-BR"].count(3)], ["1 item", "3 itens"]);
  assert.deepEqual([items["en-US"].count(1), items["en-US"].count(3)], ["1 item", "3 items"]);
});

// Checks the typecheck refuses an English catalog that misses a key or whose message takes other values, so no text can
// be left untranslated (these lines fail `typecheck` if catalog() stops refusing them).
test("Shared: an English catalog must have the Portuguese one's keys and values", () => {
  // @ts-expect-error: the English texts miss "save".
  catalog({ save: "Salvar", cancel: "Cancelar" }, { cancel: "Cancel" });
  // @ts-expect-error: the English message takes a string where the Portuguese one takes a number.
  catalog({ count: (count: number) => `${count}` }, { count: (count: string) => count });
});

// Writes the same number, price and moment in each language, and checks Portuguese reads as it always has and the
// price stays in reais in English.
test("Shared: numbers, prices and dates are written in each language's way", () => {
  assert.deepEqual([formatNumber(1234, "pt-BR"), formatNumber(1234, "en-US")], ["1.234", "1,234"]);
  assert.deepEqual(
    [formatPrice(123456), formatPrice(123456, "pt-BR"), formatPrice(123456, "en-US")].map((price) => price.replace(/\s/g, " ")),
    ["R$ 1.234,56", "R$ 1.234,56", "R$1,234.56"],
  );
  const moment = new Date(2026, 10, 25, 13, 5);
  assert.match(formatDateTime(moment, "pt-BR"), /^25 de nov\. de 2026,? 13:05$/);
  assert.match(formatDateTime(moment, "en-US"), /^Nov 25, 2026,? 1:05\sPM$/);
});
