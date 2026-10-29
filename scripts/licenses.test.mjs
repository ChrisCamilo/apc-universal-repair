import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { allowed, androidLibraries, NOTICES_FILE, pomLicense, problems } from "./licenses.mjs";

// The license audit's rules (scripts/licenses.mjs): which licenses pass without review, that a copyleft one in a new
// dependency fails the check, and that the notices cover what the installer ships.

/** The desktop server's native modules, as scripts/bundle-server.mjs installs them, on Windows only. */
const SERVER_MODULES = path.join(import.meta.dirname, "..", "apps", "desktop", "server", "node_modules");

// Checks permissive licenses pass alone and in expressions, an OR passes when one choice does, and an AND only when
// every part does.
test("Repo: permissive licenses pass, alone or in an expression, and copyleft ones don't", () => {
  for (const license of ["MIT", "ISC", "Apache-2.0", "BSD-3-Clause", "(MIT OR Apache-2.0)", "MIT and ISC", "(GPL-3.0 OR MIT)"]) {
    assert.equal(allowed(license), true, license);
  }
  for (const license of ["GPL-3.0", "AGPL-3.0-only", "MIT AND GPL-2.0", "Apache-2.0 AND LGPL-3.0-or-later", "SEE LICENSE IN LICENSE.txt"]) {
    assert.equal(allowed(license), false, license);
  }
});

// Gives the check a GPL dependency, a package with a custom license, and the reviewed ones, and checks only the first
// two fail it.
test("Repo: a new dependency under the GPL fails the license check, the reviewed ones don't", () => {
  const found = problems([
    { name: "left-pad-gpl", version: "1.0.0", license: "GPL-3.0" },
    { name: "mystery", version: "2.0.0", license: "SEE LICENSE IN LICENSE.txt" },
    { name: "@img/sharp-win32-x64", version: "0.35.5", license: "Apache-2.0 AND LGPL-3.0-or-later" },
    { name: "lightningcss", version: "1.33.0", license: "MPL-2.0" },
    { name: "react", version: "19.2.3", license: "MIT" },
  ]);
  assert.deepEqual(found, ["left-pad-gpl 1.0.0: GPL-3.0", "mystery 2.0.0: SEE LICENSE IN LICENSE.txt"]);
  assert.deepEqual(problems([{ name: "lightningcss", version: "1.33.0", license: "GPL-3.0" }]), ["lightningcss 1.33.0: GPL-3.0"]);
});

// Reads the desktop server's native modules, which the installer ships, and checks each has its notice; skipped where
// the server isn't bundled with them, off Windows.
test("Repo: the notices cover every module the installer's server ships", { skip: !existsSync(SERVER_MODULES) }, () => {
  const notices = readFileSync(NOTICES_FILE, "utf8");
  const modules = readdirSync(SERVER_MODULES)
    .filter((name) => !name.startsWith("."))
    .flatMap((name) => (name.startsWith("@") ? readdirSync(path.join(SERVER_MODULES, name)).map((each) => `${name}/${each}`) : [name]));
  for (const name of modules) {
    const real = JSON.parse(readFileSync(path.join(SERVER_MODULES, name, "package.json"), "utf8")).name;
    assert.ok(notices.includes(`### ${real} `), real);
  }
});

// Android libraries' POMs spell the same license many ways: each spelling found in the release's tree maps to its SPDX
// id, and a name the table doesn't know stays as it is, so the check fails on it.
test("Repo: the Android libraries' license names map to SPDX ids, and an unknown one fails the check", () => {
  const names = {
    "The Apache Software License, Version 2.0": "Apache-2.0",
    "The Apache License, Version 2.0": "Apache-2.0",
    "APACHE-2": "Apache-2.0",
    "Apache-2": "Apache-2.0",
    "Apache-2.0": "Apache-2.0",
    "MIT License": "MIT",
    "MIT license": "MIT",
    MIT: "MIT",
    "BSD License": "BSD-3-Clause",
  };
  for (const [name, spdx] of Object.entries(names)) {
    assert.equal(pomLicense(name), spdx, name);
  }
  assert.deepEqual(problems([{ name: "org.example:copyleft", version: "1.0", license: pomLicense("GNU General Public License v3") }]), [
    "org.example:copyleft 1.0: GNU General Public License v3",
  ]);
});

// Reads the committed list of the release's Android libraries and checks every one has a license that passes.
test("Repo: every Android library in the phone app's release has an allowed license", () => {
  const libraries = androidLibraries();
  assert.ok(libraries.length > 0);
  assert.deepEqual(problems(libraries), []);
});
