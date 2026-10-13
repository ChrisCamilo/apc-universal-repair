import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { contentSecurityPolicy, staticFile } from "./files.ts";

// A web build with an index.html and one asset, in a temporary folder.
const ROOT = mkdtempSync(path.join(tmpdir(), "apc-web-"));
mkdirSync(path.join(ROOT, "assets"));
writeFileSync(path.join(ROOT, "index.html"), "<!doctype html>");
writeFileSync(path.join(ROOT, "assets", "index.js"), "");

// Asks for an asset, an app route and a missing asset, and checks the asset is served, the route gets index.html
// for the router, and the missing asset gets a 404 instead of the page.
test("Desktop: the protocol serves the build's files, with index.html for the app's routes", () => {
  assert.equal(staticFile(ROOT, "/assets/index.js"), path.join(ROOT, "assets", "index.js"));
  assert.equal(staticFile(ROOT, "/"), path.join(ROOT, "index.html"));
  assert.equal(staticFile(ROOT, "/inventory"), path.join(ROOT, "index.html"));
  assert.equal(staticFile(ROOT, "/assets/missing.js"), undefined);
});

// Asks for paths that climb out of the build folder, plain and encoded, and checks none reaches a file outside it.
test("Desktop: a path can't climb out of the web build", () => {
  for (const pathname of ["/../package.json", "/%2e%2e/%2e%2e/package.json", "/assets/..%5C..%5Cpackage.json"]) {
    const file = staticFile(ROOT, pathname);
    assert.ok(file === undefined || file.startsWith(ROOT + path.sep), `${pathname} gave ${file}`);
  }
});

// Builds the policy of a page with an inline script and an external one, and checks only the inline script is
// allowed, by its hash, with no 'unsafe-inline' for scripts.
test("Desktop: the page's policy allows its inline script by hash only", () => {
  const code = "document.documentElement.dataset.mode='dark'";
  const policy = contentSecurityPolicy(`<head><script>${code}</script><script type="module" src="/assets/index.js"></script></head>`);
  const hash = createHash("sha256").update(code).digest("base64");
  assert.match(policy, new RegExp(`script-src 'self' 'sha256-${hash.replace(/[+/]/g, "\\$&")}'(;|$)`));
  assert.doesNotMatch(policy, /script-src[^;]*unsafe-inline/);
  assert.match(policy, /connect-src 'self'/);
});
