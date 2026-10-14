import assert from "node:assert/strict";
import { test } from "node:test";
import { releaseVersion } from "./release-version.ts";

// Checks a release publishes the desktop app's version only when the API is at the same one.
test("Desktop: a release needs the same version in apps/desktop and apps/api", () => {
  assert.equal(releaseVersion("0.2.0", "0.2.0"), "0.2.0");
  assert.throws(() => releaseVersion("0.2.0", "0.0.0"), /apps\/desktop is at 0\.2\.0 and apps\/api at 0\.0\.0/);
});
