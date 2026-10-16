import "dotenv/config";
import { spawnSync } from "node:child_process";
import { migrate } from "../src/db/migrate.js";
import { databaseProvider, databaseUrl, sqliteFile } from "../src/db/provider.js";

// The database commands of the API, on the database DATABASE_URL names, or the default SQLite file (see
// src/db/provider.ts), so they work the same on both: `pnpm --filter @apc/api db:migrate` applies the pending
// migrations with the API's own runner (src/db/migrate.ts), the one the desktop app runs too, and `db:check` fails when
// the database doesn't match its schema, through the Prisma CLI.

/** The Prisma config and schema of each database. */
const SETUPS = {
  postgresql: { config: "prisma.config.ts", schema: "prisma/schema.prisma" },
  sqlite: { config: "prisma.sqlite.config.ts", schema: "prisma/sqlite/schema.prisma" },
};

const url = databaseUrl();
const provider = databaseProvider(url);
console.log(`Database: ${provider === "sqlite" ? `SQLite, ${sqliteFile(url)}` : "PostgreSQL"}`);
const command = process.argv[2];
if (command === "migrate") {
  const applied = await migrate(url, (name) => console.log(`  Applied ${name}`));
  console.log(applied.length > 0 ? `${applied.length} migration(s) applied.` : "No pending migrations to apply.");
} else if (command === "check") {
  const { config, schema } = SETUPS[provider];
  const run = spawnSync("pnpm", ["exec", "prisma", "migrate", "diff", "--from-config-datasource", "--to-schema", schema, "--exit-code", "--config", config], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, DATABASE_URL: url },
  });
  process.exit(run.status ?? 1);
} else {
  console.error("Usage: tsx scripts/db.ts <migrate | check>");
  process.exit(1);
}
