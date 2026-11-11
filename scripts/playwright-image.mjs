// Checks the Playwright image the workflows run in matches the Playwright the lockfile resolves (#458). The image
// (mcr.microsoft.com/playwright:v<version>-<os>) comes with the browsers of its own version, and Playwright refuses
// browsers of another one, so a bump of @playwright/test and playwright must change the image's tag too.
// `node scripts/playwright-image.mjs` (CI) fails, naming the files to change, when a workflow's tag and the lockfile
// differ, or when the lockfile holds more than one Playwright.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** The Playwright image's tag in a workflow, e.g. "mcr.microsoft.com/playwright:v1.63.0-noble". */
const IMAGE = /mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)/g;
/** A Playwright package's entry in pnpm-lock.yaml's packages, e.g. "  '@playwright/test@1.63.0':" or "  playwright@1.63.0:". */
const LOCKED = /^ {2}'?(?:@playwright\/test|playwright|playwright-core)@(\d+\.\d+\.\d+)'?:$/gm;
/** The repository's folder. */
const ROOT = path.join(import.meta.dirname, "..");
/** The workflows' folder. */
const WORKFLOWS = path.join(ROOT, ".github", "workflows");

/**
 * Lists the Playwright images a workflow runs in.
 * @param {string} workflow The workflow's text.
 * @returns {string[]} The image versions, e.g. ["1.63.0"].
 */
export function imageVersions(workflow) {
  return [...workflow.matchAll(IMAGE)].map((match) => match[1]);
}

/**
 * Lists the Playwright versions the lockfile resolves, @playwright/test's, playwright's and playwright-core's.
 * @param {string} lockfile pnpm-lock.yaml's text.
 * @returns {string[]} Each version once, e.g. ["1.63.0"].
 */
export function lockedVersions(lockfile) {
  return [...new Set([...lockfile.matchAll(LOCKED)].map((match) => match[1]))];
}

/**
 * Says what keeps the workflows' Playwright images from matching the lockfile.
 * @param {string} lockfile pnpm-lock.yaml's text.
 * @param {Record<string, string>} workflows Each workflow's text, by its file name.
 * @returns {string[]} One message per problem; none when every image matches.
 */
export function problems(lockfile, workflows) {
  const locked = lockedVersions(lockfile);
  if (locked.length !== 1) {
    return [`pnpm-lock.yaml resolves ${locked.length === 0 ? "no Playwright" : `several Playwright versions (${locked.join(", ")})`}; keep one.`];
  }
  return Object.entries(workflows).flatMap(([file, text]) =>
    imageVersions(text)
      .filter((version) => version !== locked[0])
      .map((version) => `${file} runs in Playwright's image v${version}, but pnpm-lock.yaml resolves Playwright ${locked[0]}: change the image's tag to v${locked[0]}.`),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const workflows = Object.fromEntries(
    readdirSync(WORKFLOWS)
      .filter((file) => file.endsWith(".yml"))
      .map((file) => [`.github/workflows/${file}`, readFileSync(path.join(WORKFLOWS, file), "utf8")]),
  );
  const lockfile = readFileSync(path.join(ROOT, "pnpm-lock.yaml"), "utf8");
  const found = problems(lockfile, workflows);
  for (const problem of found) {
    console.error(`::error::${problem}`);
  }
  if (found.length === 0) {
    console.log(`Playwright's image matches the lockfile (${lockedVersions(lockfile)[0]}).`);
  }
  process.exitCode = found.length > 0 ? 1 : 0;
}
