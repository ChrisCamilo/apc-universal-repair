// Writes dist/build-info.json with the apps/api folder of this clone, the folder the desktop app starts the API from
// when it doesn't answer and nothing else sets one (see src/main.ts). It is written on every build, never committed.
// On CI (the releases) the clone is the runner's, which no other computer has, so no folder is written: an app
// installed from a release starts the API from `apiDir` in its config.json.
import { writeFileSync } from "node:fs";
import path from "node:path";

const info = process.env.CI ? {} : { apiDir: path.resolve(import.meta.dirname, "..", "..", "api") };
writeFileSync(path.join(import.meta.dirname, "..", "dist", "build-info.json"), `${JSON.stringify(info, null, 2)}\n`);
