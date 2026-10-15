// Reads apps/api/.env (DATABASE_URL, PORT, PHOTOS_DIR) before anything uses it; variables already set win.
import "dotenv/config";
import { buildApp } from "./app.js";
import { prepareDatabase } from "./db/client.js";

const app = buildApp();
const port = Number(process.env.PORT ?? 3333);

prepareDatabase()
  .then(() => app.listen({ port, host: "0.0.0.0" }))
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
