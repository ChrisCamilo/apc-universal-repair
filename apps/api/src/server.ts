// Reads apps/api/.env (DATABASE_URL, PORT, PHOTOS_DIR) before anything uses it; variables already set win. With
// APC_SQLITE_KEY, as the desktop app sets it, the SQLite file is encrypted first if it is still plain, and the server
// refuses to start when the key doesn't open it (see db/cipher.ts). With APC_MIGRATE_ON_START=1, as the desktop app
// runs the server it ships, the API then applies the pending migrations of its database (see db/migrate.ts), so it
// migrates itself on every update, after copying a SQLite file to backups/ (see db/backup.ts); in development
// `db:migrate` does. Then it turns WAL on for SQLite and listens on PORT, or else on DEV_SERVER_PORT when started for
// development (`pnpm dev`, which passes --dev) and on SERVER_PORT otherwise, as the desktop app and `pnpm start` run it.
import "dotenv/config";
import { DEV_SERVER_PORT, SERVER_PORT } from "@apc/shared/server";
import { buildApp } from "./app.js";
import { backupBeforeMigrating } from "./db/backup.js";
import { ensureEncrypted } from "./db/cipher.js";
import { prepareDatabase } from "./db/client.js";
import { migrate } from "./db/migrate.js";
import { databaseUrl } from "./db/provider.js";
import { API_VERSION } from "./routes/health.js";

const app = buildApp();
const port = Number(process.env.PORT ?? (process.argv.includes("--dev") ? DEV_SERVER_PORT : SERVER_PORT));

Promise.resolve()
  .then(() => {
    if (ensureEncrypted(databaseUrl()) === "encrypted") {
      app.log.info("Encrypted the SQLite file with its key.");
    }
  })
  .then(async () => {
    if (process.env.APC_MIGRATE_ON_START !== "1") {
      return;
    }
    const backup = await backupBeforeMigrating(databaseUrl(), API_VERSION);
    if ("made" in backup) {
      app.log.info(`Copied the database to ${backup.made} before migrating.`);
    } else if (backup.skipped === "postgresql") {
      app.log.warn("New migrations will run on PostgreSQL, which isn't copied first: keep a pg_dump from before the update.");
    }
    await migrate(databaseUrl(), (name) => app.log.info(`Applied the migration ${name}`));
  })
  .then(prepareDatabase)
  .then(() => app.listen({ port, host: "0.0.0.0" }))
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
