// Checks the app's own build holds nothing of the web app's demo (src/demo), which only the demo's build brings in: no
// file in dist carries the demo's marker. The build script runs it after `vite build`, so a build that would ship the
// demo's API to the real app fails.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DEMO_MARKER } from "../src/demo/demoMarker.ts";

const DIST = path.join(import.meta.dirname, "..", "dist");

const found = readdirSync(DIST, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && readFileSync(path.join(entry.parentPath, entry.name), "utf8").includes(DEMO_MARKER))
  .map((entry) => path.relative(DIST, path.join(entry.parentPath, entry.name)));
if (found.length > 0) {
  console.error(`The app's build holds the demo (${DEMO_MARKER}) in: ${found.join(", ")}`);
  process.exit(1);
}
console.log("The app's build holds nothing of the demo.");
