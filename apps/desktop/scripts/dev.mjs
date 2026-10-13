// `pnpm --filter @apc/desktop dev`: waits for the web dev server (pnpm dev) and opens the desktop app on it, with the
// compiled main process. ELECTRON_RUN_AS_NODE is cleared, since with it set Electron runs as plain Node.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const DEV_URL = "http://localhost:5173";
const electron = createRequire(import.meta.url)("electron");

for (;;) {
  try {
    await fetch(DEV_URL);
    break;
  } catch {
    console.log(`Waiting for ${DEV_URL} (run pnpm dev)…`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
const env = { ...process.env, APC_DEV_URL: DEV_URL };
delete env.ELECTRON_RUN_AS_NODE;
spawn(electron, ["."], { cwd: path.join(import.meta.dirname, ".."), env, stdio: "inherit" }).on("exit", (code) => process.exit(code ?? 0));
