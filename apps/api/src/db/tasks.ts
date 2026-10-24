import { changeKey, keyOpens, setSqliteKey } from "./cipher.js";
import { holdsAnyData, importProblem, importServer, type ImportSetup } from "./import.js";
import { checkDatabase, migrate } from "./migrate.js";

// The database tasks the desktop app runs beside its server, each in an Electron utility process of its own (see
// apps/desktop/src/serverTasks.ts), bundled as server/tasks.mjs: checking a database before the server moves onto it,
// migrating it, importing an old server (see import.ts), telling whether a database holds any data, whether a key,
// such as a recovery copy typed back, opens a SQLite file, and changing the key of the server's own file. The app
// sends one task and gets one answer back: what the task gave, or the message of what failed, such as a PostgreSQL address that doesn't connect. The app's own SQLite
// file takes its key from APC_SQLITE_KEY; a task may bring the keys of other files, such as an encrypted one being
// imported (see cipher.ts).

/** The utility process's port to the app, which only Electron sets. */
const { parentPort } = process as unknown as {
  parentPort: {
    once: (event: "message", listener: (message: { data: Task & { keys?: Record<string, string> } }) => void) => void;
    postMessage: (answer: TaskAnswer) => void;
  };
};

/** A task the app asks for. */
export type Task =
  | { task: "check"; url: string }
  | { task: "holdsData"; url: string }
  | { task: "import"; setup: ImportSetup }
  | { task: "importProblem"; from: string; to: string }
  | { task: "keyOpens"; url: string }
  | { task: "migrate"; url: string }
  | { task: "rekey"; url: string; key: string };
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
    case "holdsData":
      return holdsAnyData(task.url);
    case "import":
      return importServer(task.setup);
    case "importProblem":
      return importProblem(task.from, task.to);
    case "keyOpens":
      return Promise.resolve(keyOpens(task.url));
    case "migrate":
      return migrate(task.url);
    case "rekey":
      return Promise.resolve(changeKey(task.url, task.key));
  }
}

parentPort.once("message", ({ data }) => {
  for (const [url, key] of Object.entries(data.keys ?? {})) {
    setSqliteKey(url, key);
  }
  run(data).then(
    (result) => parentPort.postMessage({ ok: true, result: result ?? null }),
    (error: Error) => parentPort.postMessage({ ok: false, message: error.message }),
  );
});
