import assert from "node:assert/strict";
import { test } from "node:test";
import { setLanguage } from "../texts.ts";
import { statusPage } from "./statusPage.ts";

/**
 * Reads the page a data: address holds.
 * @param address The address.
 * @returns The page's HTML.
 */
function pageOf(address: string): string {
  assert.match(address, /^data:text\/html;charset=utf-8,/);
  return decodeURIComponent(address.slice(address.indexOf(",") + 1));
}

// Writes the page shown while the server starts and the one shown while an update goes in, in Portuguese and then
// with English chosen in the page, and checks each says what goes on in that language, marked with it, and runs no
// script.
test("Desktop: the starting and updating pages read in the language chosen", (t) => {
  const starting = pageOf(statusPage("starting"));
  assert.match(starting, /<html lang="pt-BR">/);
  assert.match(starting, /aria-label="Ligando o servidor"/);
  assert.match(starting, /<p>Ligando o servidor APC…<\/p>/);
  assert.match(starting, /<p class="hint">Na primeira vez isso pode levar até um minuto\.<\/p>/);
  assert.match(starting, /default-src 'none'; style-src 'unsafe-inline'/);
  assert.doesNotMatch(starting, /<script/);
  assert.match(pageOf(statusPage("updating")), /<p>Atualizando o APC…<\/p>/);

  setLanguage("en-US");
  t.after(() => setLanguage("pt-BR"));
  const english = pageOf(statusPage("starting"));
  assert.match(english, /<html lang="en-US">/);
  assert.match(english, /aria-label="Starting the server"/);
  assert.match(english, /<p>Starting the APC server…<\/p>/);
  assert.match(english, /<p class="hint">The first time, this can take up to a minute\.<\/p>/);
  const updating = pageOf(statusPage("updating"));
  assert.match(updating, /<p>Updating APC…<\/p>/);
  assert.match(updating, /<p class="hint">When it ends, APC opens by itself, already on the new version\. There's no need to open it again\.<\/p>/);
});
