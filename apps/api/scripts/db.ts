import "dotenv/config";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { databaseProvider, databaseUrl, sqliteFile } from "../src/db/provider.js";

// Runs the Prisma CLI on the schema of the database DATABASE_URL names, or the default SQLite file (see
// src/db/provider.ts), so the same commands work on both: `pnpm --filter @apc/api db:migrate` applies the pending
// migrations, creating a SQLite file's folder first, and `db:check` fails when the database doesn't match its schema.

/** The Prisma config and schema of each database. */
const SETUPS = {
  postgresql: { config: "prisma.config.ts", schema: "prisma/schema.prisma" },
  sqlite: { config: "prisma.sqlite.config.ts", schema: "prisma/sqlite/schema.prisma" },
};

const url = databaseUrl();
const provider = databaseProvider(url);
const { config, schema } = SETUPS[provider];
const commands: Record<string, string[]> = {
  check: ["migrate", "diff", "--from-config-datasource", "--to-schema", schema, "--exit-code"],
  migrate: ["migrate", "deploy"],
};
const args = commands[process.argv[2]];
if (!args) {
  console.error(`Usage: tsx scripts/db.ts <${Object.keys(commands).join(" | ")}>`);
  process.exit(1);
}
if (provider === "sqlite") {
  mkdirSync(path.dirname(sqliteFile(url)), { recursive: true });
}
console.log(`Database: ${provider === "sqlite" ? `SQLite, ${sqliteFile(url)}` : "PostgreSQL"}`);
const run = spawnSync("pnpm", ["exec", "prisma", ...args, "--config", config], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: url },
});
process.exit(run.status ?? 1);
