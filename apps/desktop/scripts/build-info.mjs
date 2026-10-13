// Writes dist/build-info.json with the apps/api folder of this clone, the folder the desktop app starts the API from
// when it doesn't answer and nothing else sets one (see src/main.ts). It is written on every build, never committed.
import { writeFileSync } from "node:fs";
import path from "node:path";

const apiDir = path.resolve(import.meta.dirname, "..", "..", "api");
writeFileSync(path.join(import.meta.dirname, "..", "dist", "build-info.json"), `${JSON.stringify({ apiDir }, null, 2)}\n`);
