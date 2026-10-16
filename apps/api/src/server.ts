// Reads apps/api/.env (DATABASE_URL, PORT, PHOTOS_DIR) before anything uses it; variables already set win. With
// APC_MIGRATE_ON_START=1, as the desktop app runs the server it ships, the API first applies the pending migrations of
// its database (see db/migrate.ts), so it migrates itself on every update; in development `db:migrate` does. Then it
// turns WAL on for SQLite and listens.
import "dotenv/config";
import { buildApp } from "./app.js";
import { prepareDatabase } from "./db/client.js";
import { migrate } from "./db/migrate.js";
import { databaseUrl } from "./db/provider.js";

const app = buildApp();
const port = Number(process.env.PORT ?? 3333);

const migrated =
  process.env.APC_MIGRATE_ON_START === "1" ? migrate(databaseUrl(), (name) => app.log.info(`Applied the migration ${name}`)) : Promise.resolve();

migrated
  .then(prepareDatabase)
  .then(() => app.listen({ port, host: "0.0.0.0" }))
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
