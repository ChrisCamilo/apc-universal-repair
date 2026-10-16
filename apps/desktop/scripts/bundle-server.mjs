// Bundles the API into server/ for the desktop app to run (see src/bundledServer.ts), and electron-builder ships the
// folder as resources/server:
// - server.mjs: the API with its JavaScript dependencies, built by esbuild from apps/api/src;
// - migrations/: its SQL files, one folder per database, which the API applies on start (APC_MIGRATIONS_DIR);
// - node_modules/: the two native modules esbuild can't bundle: better-sqlite3, compiled for this Electron by
//   @electron/rebuild, as its releases have no prebuilt binaries for it (which takes Visual Studio's C++ build tools),
//   and sharp, whose binaries work on any Node.
// The native modules only change with their versions or Electron's, so they are fetched again only then. On a
// computer other than Windows only the JavaScript and the migrations are bundled, as the app ships for Windows only.
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { rebuild } from "@electron/rebuild";
import { build } from "esbuild";

/** The desktop app's folder. */
const DESKTOP = path.join(import.meta.dirname, "..");
/** The API's folder. */
const API = path.join(DESKTOP, "..", "api");
/** The modules the bundle leaves out: native ones, and pg's optional native driver, which isn't used. */
const EXTERNAL = ["better-sqlite3", "sharp", "pg-native"];
/** The native modules the server's node_modules holds. */
const NATIVE = ["better-sqlite3", "sharp"];
/** Where the server is bundled. */
const OUT = path.join(DESKTOP, "server");

/**
 * Reads the version of a package as a folder resolves it.
 * @param from A file in the folder that depends on it, e.g. the API's package.json.
 * @param name The package.
 * @returns Its version, e.g. "12.11.1".
 */
function versionOf(from, name) {
  let folder = path.dirname(createRequire(from).resolve(name));
  while (!existsSync(path.join(folder, "package.json")) || JSON.parse(readFileSync(path.join(folder, "package.json"), "utf8")).name !== name) {
    folder = path.dirname(folder);
  }
  return JSON.parse(readFileSync(path.join(folder, "package.json"), "utf8")).version;
}

mkdirSync(OUT, { recursive: true });
await build({
  entryPoints: [path.join(API, "src", "server.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: path.join(OUT, "server.mjs"),
  external: EXTERNAL,
  // The CommonJS dependencies inside an ESM bundle reach the external modules through require.
  banner: { js: 'import { createRequire as __apcRequire } from "node:module";\nconst require = __apcRequire(import.meta.url);' },
  logLevel: "warning",
});

rmSync(path.join(OUT, "migrations"), { recursive: true, force: true });
cpSync(path.join(API, "prisma", "migrations"), path.join(OUT, "migrations", "postgresql"), { recursive: true });
cpSync(path.join(API, "prisma", "sqlite", "migrations"), path.join(OUT, "migrations", "sqlite"), { recursive: true });

if (process.platform === "win32") {
  const apiPackage = path.join(API, "package.json");
  const versions = Object.fromEntries(NATIVE.map((name) => [name, versionOf(apiPackage, name)]));
  const electron = versionOf(path.join(DESKTOP, "package.json"), "electron");
  const stamp = JSON.stringify({ electron, ...versions });
  const stampFile = path.join(OUT, "node_modules", ".apc-stamp");
  if (!existsSync(stampFile) || readFileSync(stampFile, "utf8") !== stamp) {
    rmSync(path.join(OUT, "node_modules"), { recursive: true, force: true });
    writeFileSync(path.join(OUT, "package.json"), `${JSON.stringify({ name: "apc-server", private: true, type: "module", dependencies: versions }, null, 2)}\n`);
    execSync("npm install --omit=dev --ignore-scripts --no-audit --no-fund --no-package-lock", { cwd: OUT, stdio: "inherit" });
    await rebuild({ buildPath: OUT, electronVersion: electron, onlyModules: ["better-sqlite3"], force: true });
    // Only the module and the compiled binary ship: not SQLite's sources nor the compiler's leftovers, ~70 MB.
    const sqlite = path.join(OUT, "node_modules", "better-sqlite3");
    const binary = path.join(sqlite, "build", "Release", "better_sqlite3.node");
    const kept = readFileSync(binary);
    for (const folder of ["build", "deps", "src", "bin"]) {
      rmSync(path.join(sqlite, folder), { recursive: true, force: true });
    }
    mkdirSync(path.dirname(binary), { recursive: true });
    writeFileSync(binary, kept);
    writeFileSync(stampFile, stamp);
  }
}
console.log(`Bundled the server into ${OUT}`);
