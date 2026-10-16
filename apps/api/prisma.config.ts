import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    // `prisma db seed` (pnpm db:seed) fills a new database with the default lists and sample items.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Only `prisma generate` runs here without one, which doesn't connect; scripts/db.ts always passes one.
    url: process.env.DATABASE_URL || "postgresql://localhost/apc_universal_repair",
  },
});
