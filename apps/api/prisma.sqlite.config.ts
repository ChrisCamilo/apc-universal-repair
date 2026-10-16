import "dotenv/config";
import { defineConfig } from "prisma/config";

// The same database as prisma.config.ts, on SQLite: its own schema, a copy of prisma/schema.prisma with the provider
// changed, and its own migrations. Used with --config prisma.sqlite.config.ts and a DATABASE_URL like "file:./data/apc.db".
export default defineConfig({
  schema: "prisma/sqlite/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // The default of src/db/provider.ts, when DATABASE_URL sets none.
    url: process.env.DATABASE_URL || "file:./data/apc.db",
  },
});
