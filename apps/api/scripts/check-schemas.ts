import { readFileSync } from "node:fs";
import { modelDifferences } from "../src/db/schemas.js";

// `pnpm --filter @apc/api db:check-schemas`, run by lint: fails when prisma/schema.prisma (PostgreSQL) and
// prisma/sqlite/schema.prisma hold different models. A change to the database goes in both, each with its migration.

const differences = modelDifferences(
  readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8"),
  readFileSync(new URL("../prisma/sqlite/schema.prisma", import.meta.url), "utf8"),
);
if (differences.length > 0) {
  console.error(`The PostgreSQL and SQLite schemas differ; change both the same way:\n${differences.join("\n")}`);
  process.exit(1);
}
console.log("The PostgreSQL and SQLite schemas hold the same models.");
