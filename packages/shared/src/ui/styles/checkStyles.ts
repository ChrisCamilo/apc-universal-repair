import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { findStyleProblems, type StylePlatform } from "./styleGuard.ts";

// The `lint:styles` check of the apps: `node checkStyles.ts <web|mobile> <dir>` reads every component file under the
// directory (the .tsx files, not tests or stories) and fails, listing each place, when one breaks the style
// conventions (see styleGuard.ts).

const [platform, dir] = process.argv.slice(2) as [StylePlatform, string];

/**
 * Lists the component files under a directory.
 * @param root The directory, e.g. "src".
 * @returns Their paths, in a stable order.
 */
function componentFiles(root: string): string[] {
  return readdirSync(root, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".tsx") && !/\.(test|stories)\.tsx$/.test(path))
    .sort()
    .map((path) => join(root, path));
}

const problems = componentFiles(dir).flatMap((path) =>
  findStyleProblems(readFileSync(path, "utf8"), platform).map(({ line, message }) => `${relative(".", path)}:${line} ${message}`),
);
for (const problem of problems) {
  console.error(problem);
}
if (problems.length > 0) {
  console.error(`\n${problems.length} style problem(s). See "Styles" in AGENTS.md.`);
  process.exit(1);
}
