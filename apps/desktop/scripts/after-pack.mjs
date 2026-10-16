// electron-builder's afterPack hook: copies the bundled server's native modules (server/node_modules, from
// scripts/bundle-server.mjs) into resources/server, since electron-builder leaves node_modules folders out of extra
// resources whatever their filter says.
import { cpSync } from "node:fs";
import path from "node:path";

/**
 * Copies server/node_modules next to the packed server.
 * @param {{ appOutDir: string }} context What electron-builder packed, and where.
 */
export default async function afterPack(context) {
  cpSync(path.join(import.meta.dirname, "..", "server", "node_modules"), path.join(context.appOutDir, "resources", "server", "node_modules"), {
    recursive: true,
  });
}
