import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { imageVersions, lockedVersions, problems } from "./playwright-image.mjs";

// The check that the workflows' Playwright image follows the lockfile (scripts/playwright-image.mjs): what it reads
// from each file, that a tag behind the lockfile fails naming the file and the tag to use, and that the repository's
// own files pass.

/** A lockfile's Playwright entries, as pnpm writes them. */
const LOCKFILE = ["packages:", "", "  '@playwright/test@1.63.0':", "    resolution: {}", "", "  playwright-core@1.63.0:", "", "  playwright@1.63.0:", ""].join("\n");
/** The repository's folder. */
const ROOT = path.join(import.meta.dirname, "..");
/** A workflow whose job runs in Playwright's image. */
const WORKFLOW = "jobs:\n  test:\n    container:\n      image: mcr.microsoft.com/playwright:v1.63.0-noble\n";

// Reads the versions the lockfile resolves, once each, and the image a workflow runs in.
test("Repo: the Playwright image check reads the lockfile's version and the workflows' tags", () => {
  assert.deepEqual(lockedVersions(LOCKFILE), ["1.63.0"]);
  assert.deepEqual(imageVersions(WORKFLOW), ["1.63.0"]);
  assert.deepEqual(imageVersions("jobs:\n  build:\n    runs-on: ubuntu-latest\n"), []);
});

// A workflow whose image is behind the lockfile fails, naming the file and the tag to change to; a lockfile with two
// Playwright versions, or none, fails too; a matching one passes.
test("Repo: a Playwright image other than the lockfile's version fails the check", () => {
  assert.deepEqual(problems(LOCKFILE, { "ci.yml": WORKFLOW, "android.yml": "jobs: {}\n" }), []);
  assert.deepEqual(problems(LOCKFILE.replaceAll("1.63.0", "1.64.0"), { "ci.yml": WORKFLOW }), [
    "ci.yml runs in Playwright's image v1.63.0, but pnpm-lock.yaml resolves Playwright 1.64.0: change the image's tag to v1.64.0.",
  ]);
  assert.match(problems(`${LOCKFILE}\n  playwright@1.62.0:\n`, { "ci.yml": WORKFLOW })[0], /several Playwright versions \(1\.63\.0, 1\.62\.0\)/);
  assert.match(problems("packages:\n", { "ci.yml": WORKFLOW })[0], /no Playwright/);
});

// The repository's own lockfile and workflows agree, so CI's check passes on them.
test("Repo: the workflows run in the Playwright image the lockfile resolves", () => {
  const folder = path.join(ROOT, ".github", "workflows");
  const workflows = Object.fromEntries(readdirSync(folder).map((file) => [file, readFileSync(path.join(folder, file), "utf8")]));
  assert.deepEqual(problems(readFileSync(path.join(ROOT, "pnpm-lock.yaml"), "utf8"), workflows), []);
});
