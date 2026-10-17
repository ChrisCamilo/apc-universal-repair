// Bundles the API into server/ for the desktop app to run (see src/bundledServer.ts), and electron-builder ships the
// folder as resources/server:
// - server.mjs: the API with its JavaScript dependencies, built by esbuild from apps/api/src, and tasks.mjs, the
//   database tasks the app runs beside it (apps/api/src/db/tasks.ts), sharing their code through chunks/;
// - migrations/: its SQL files, one folder per database, which the API applies on start (APC_MIGRATIONS_DIR);
// - node_modules/: the two native modules esbuild can't bundle: better-sqlite3, which the workspace installs as
//   better-sqlite3-multiple-ciphers to encrypt the SQLite file (pnpm-workspace.yaml), compiled for this Electron by
//   @electron/rebuild, as its releases have no prebuilt binaries for it (which takes Visual Studio's C++ build tools),
//   and sharp, whose binaries work on any Node.
// The native modules only change with their versions or Electron's, so they are fetched again only then. On a
// computer other than Windows only the JavaScript and the migrations are bundled, as the app ships for Windows only.
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
 * Reads the package a folder resolves a name to, which an override may have swapped for another.
 * @param from A file in the folder that depends on it, e.g. the API's package.json.
 * @param name The name it imports, e.g. "better-sqlite3".
 * @returns How package.json asks for it: its version, e.g. "12.11.1", or the package it is with its version, e.g.
 * "npm:better-sqlite3-multiple-ciphers@12.11.1".
 */
function versionOf(from, name) {
  // Node's lookup, by hand: resolving follows pnpm's links to the package's real folder, named after what it is.
  let folder = path.dirname(from);
  while (!existsSync(path.join(folder, "node_modules", name, "package.json"))) {
    folder = path.dirname(folder);
  }
  const found = JSON.parse(readFileSync(path.join(folder, "node_modules", name, "package.json"), "utf8"));
  return found.name === name ? found.version : `npm:${found.name}@${found.version}`;
}

mkdirSync(OUT, { recursive: true });
rmSync(path.join(OUT, "chunks"), { recursive: true, force: true });
await build({
  entryPoints: { server: path.join(API, "src", "server.ts"), tasks: path.join(API, "src", "db", "tasks.ts") },
  bundle: true,
  splitting: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outdir: OUT,
  outExtension: { ".js": ".mjs" },
  chunkNames: "chunks/[name]-[hash]",
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
    // projectRootPath keeps it in OUT: without it, it walks up and rebuilds the workspace's copy too, which the API's
    // tests and dev server load in Node.
    await rebuild({ buildPath: OUT, projectRootPath: OUT, electronVersion: electron, onlyModules: ["better-sqlite3"], force: true });
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
