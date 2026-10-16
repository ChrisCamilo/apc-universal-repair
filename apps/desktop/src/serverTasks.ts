import path from "node:path";
import { utilityProcess } from "electron";

// Runs one of the database tasks the server ships (server/tasks.mjs, from apps/api/src/db/tasks.ts) in an Electron
// utility process of its own, with the migrations the app ships, and gives back its answer: checking a database,
// migrating it, and importing an old server. The process ends once it has answered.

/** A task of server/tasks.mjs, as apps/api/src/db/tasks.ts takes it. */
export type ServerTask =
  | { task: "check"; url: string }
  | { task: "import"; setup: { from: string; to: string; photosFrom?: string; photosTo: string } }
  | { task: "importProblem"; from: string; to: string }
  | { task: "migrate"; url: string };
/** What server/tasks.mjs answers. */
type TaskAnswer = { ok: true; result: unknown } | { ok: false; message: string };

/**
 * Runs a database task.
 * @param serverDir The bundled server's folder.
 * @param task The task.
 * @returns What it gave; it rejects with the task's message when it fails, as for an address that doesn't connect.
 */
export function runServerTask<T>(serverDir: string, task: ServerTask): Promise<T> {
  return new Promise((resolve, reject) => {
    const child = utilityProcess.fork(path.join(serverDir, "tasks.mjs"), [], {
      env: { ...process.env, APC_MIGRATIONS_DIR: path.join(serverDir, "migrations") },
      serviceName: "APC Universal Repair database task",
    });
    let answered = false;
    child.once("spawn", () => child.postMessage(task));
    child.once("message", (answer: TaskAnswer) => {
      answered = true;
      child.kill();
      if (answer.ok) {
        resolve(answer.result as T);
      } else {
        reject(new Error(answer.message));
      }
    });
    child.once("exit", (code) => {
      if (!answered) {
        reject(new Error(`The database task stopped without answering (exit code ${code}).`));
      }
    });
  });
}
