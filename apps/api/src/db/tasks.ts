import { importProblem, importServer, type ImportSetup } from "./import.js";
import { checkDatabase, migrate } from "./migrate.js";

// The database tasks the desktop app runs beside its server, each in an Electron utility process of its own (see
// apps/desktop/src/serverTasks.ts), bundled as server/tasks.mjs: checking a database before the server moves onto it,
// migrating it, and importing an old server (see import.ts). The app sends one task and gets one answer back: what the
// task gave, or the message of what failed, such as a PostgreSQL address that doesn't connect.

/** The utility process's port to the app, which only Electron sets. */
const { parentPort } = process as unknown as {
  parentPort: { once: (event: "message", listener: (message: { data: Task }) => void) => void; postMessage: (answer: TaskAnswer) => void };
};

/** A task the app asks for. */
export type Task =
  | { task: "check"; url: string }
  | { task: "import"; setup: ImportSetup }
  | { task: "importProblem"; from: string; to: string }
  | { task: "migrate"; url: string };
/** What the app gets back. */
export type TaskAnswer = { ok: true; result: unknown } | { ok: false; message: string };

/**
 * Runs a task.
 * @param task What the app asked for.
 * @returns What the task gave.
 */
function run(task: Task): Promise<unknown> {
  switch (task.task) {
    case "check":
      return checkDatabase(task.url);
    case "import":
      return importServer(task.setup);
    case "importProblem":
      return importProblem(task.from, task.to);
    case "migrate":
      return migrate(task.url);
  }
}

parentPort.once("message", ({ data }) => {
  run(data).then(
    (result) => parentPort.postMessage({ ok: true, result: result ?? null }),
    (error: Error) => parentPort.postMessage({ ok: false, message: error.message }),
  );
});
