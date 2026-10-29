import assert from "node:assert/strict";
import { test } from "node:test";
import { releaseVersion } from "./release-version.ts";

// Checks a release publishes the desktop app's version only when the API and the phone app are at the same one, since
// the three ship together.
test("Desktop: a release needs the same version in apps/desktop, apps/api and apps/mobile", () => {
  assert.equal(releaseVersion("0.2.0", "0.2.0", "0.2.0"), "0.2.0");
  assert.throws(
    () => releaseVersion("0.2.0", "0.0.0", "0.2.0"),
    /apps\/desktop is at 0\.2\.0, apps\/api at 0\.0\.0 and apps\/mobile at 0\.2\.0/,
  );
  assert.throws(
    () => releaseVersion("0.2.0", "0.2.0", "0.0.1"),
    /apps\/desktop is at 0\.2\.0, apps\/api at 0\.2\.0 and apps\/mobile at 0\.0\.1/,
  );
});
