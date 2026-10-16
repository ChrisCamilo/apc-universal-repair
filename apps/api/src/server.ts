// Reads apps/api/.env (DATABASE_URL, PORT, PHOTOS_DIR) before anything uses it; variables already set win. On start the
// API applies the pending migrations of its database (see db/migrate.ts), so a server that ships with the desktop app
// migrates itself on every update, then turns WAL on for SQLite and listens.
import "dotenv/config";
import { buildApp } from "./app.js";
import { prepareDatabase } from "./db/client.js";
import { migrate } from "./db/migrate.js";
import { databaseUrl } from "./db/provider.js";

const app = buildApp();
const port = Number(process.env.PORT ?? 3333);

migrate(databaseUrl(), (name) => app.log.info(`Applied the migration ${name}`))
  .then(prepareDatabase)
  .then(() => app.listen({ port, host: "0.0.0.0" }))
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
