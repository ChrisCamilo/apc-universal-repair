import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { findTextProblems } from "./textGuard.ts";

// The `lint:texts` check of the apps: `node checkTexts.ts <dir>` reads every component file under the directory (the
// .tsx files, not tests, stories or the web's Storybook screens in stories/, which the app doesn't ship) and fails,
// listing each place, when one writes a Portuguese text instead of taking it from a catalog (see textGuard.ts).

const [dir] = process.argv.slice(2);

/**
 * Lists the component files under a directory.
 * @param root The directory, e.g. "src".
 * @returns Their paths, in a stable order.
 */
function componentFiles(root: string): string[] {
  return readdirSync(root, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".tsx") && !/\.(test|stories)\.tsx$/.test(path) && !/(^|[\\/])stories[\\/]/.test(path))
    .sort()
    .map((path) => join(root, path));
}

const problems = componentFiles(dir).flatMap((path) =>
  findTextProblems(readFileSync(path, "utf8")).map(({ line, text }) => `${relative(".", path)}:${line} "${text}" is written in the component`),
);
for (const problem of problems) {
  console.error(problem);
}
if (problems.length > 0) {
  console.error(`\n${problems.length} text(s) outside the catalogs. See "Texts in both languages" in AGENTS.md.`);
  process.exit(1);
}
