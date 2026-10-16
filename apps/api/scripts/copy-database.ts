import "dotenv/config";
import { parseArgs } from "node:util";
import { createPrisma } from "../src/db/client.js";
import { copyDatabase, copyProblems, serverAnswers } from "../src/db/copy.js";
import { databaseProvider, sqliteFile } from "../src/db/provider.js";

// `pnpm --filter @apc/api db:copy --from <DATABASE_URL> --to <DATABASE_URL> [--force]`: copies the data from one
// database to another (see src/db/copy.ts), e.g. from the PostgreSQL in use to a new SQLite file made with db:migrate.
// It refuses while a server answers on this computer, as it would keep writing to the source, unless --force.

const { values } = parseArgs({
  options: { from: { type: "string" }, to: { type: "string" }, force: { type: "boolean", default: false } },
});
if (!values.from || !values.to) {
  console.error("Usage: pnpm --filter @apc/api db:copy --from <DATABASE_URL> --to <DATABASE_URL> [--force]");
  process.exit(1);
}
const describe = (url: string) => (databaseProvider(url) === "sqlite" ? `SQLite, ${sqliteFile(url)}` : "PostgreSQL");
if (describe(values.from) === describe(values.to) && (databaseProvider(values.from) === "sqlite" || values.from === values.to)) {
  console.error("The source and the target are the same database.");
  process.exit(1);
}
// 127.0.0.1, not localhost, which Node may resolve to ::1 while the API listens on IPv4.
const server = `http://127.0.0.1:${process.env.PORT ?? 3333}`;
if (!values.force && (await serverAnswers(server))) {
  console.error(`A server answers at ${server}: turn it off first (quit the desktop app, or stop pnpm dev), or pass --force.`);
  process.exit(1);
}

const source = createPrisma(values.from);
const target = createPrisma(values.to);
try {
  console.log(`From: ${describe(values.from)}\nTo:   ${describe(values.to)}`);
  const problems = await copyProblems({ client: source, url: values.from }, { client: target, url: values.to });
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exitCode = 1;
  } else {
    const counts = await copyDatabase(source, target, (table, rows) => console.log(`  ${table}: ${rows}`));
    console.table(counts);
    const equal = Object.values(counts).every((count) => count.source === count.target);
    console.log(equal ? "Copied: every table holds the same rows on both sides. Sessions were left out." : "The counts differ.");
    process.exitCode = equal ? 0 : 1;
  }
} finally {
  await Promise.all([source.$disconnect(), target.$disconnect()]);
}
