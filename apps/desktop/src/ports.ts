import { execFile } from "node:child_process";
import { createServer } from "node:net";
import { promisify } from "node:util";
import { SERVER_PORT } from "./bundledServer.ts";
import type { DesktopConfig } from "./config.ts";

// The port the server the app runs listens on: SERVER_PORT, or the one config.json keeps once the user changed it in
// the Servidor dialog; whether it is free, tried the way the server binds it; and, when it isn't, which program holds
// it, from the system's TCP table (`netstat -ano`, whose listening sockets have a foreign address of port 0 in every
// language) and the process list (`tasklist`). Only Windows names the program.

/** The lowest port the user may pick: the ones below need administrator rights. */
export const MIN_PORT = 1024;
/** The highest port there is. */
export const MAX_PORT = 65535;

/** The program holding a port: its process id, and its name when the process list gives it. */
export type PortOwner = { pid: number; name?: string };

const run = promisify(execFile);

/**
 * Reads the port the server listens on from config.json.
 * @param config What config.json sets.
 * @returns Its port when it is a whole number from MIN_PORT to MAX_PORT, otherwise SERVER_PORT.
 */
export function configuredPort(config: DesktopConfig): number {
  return validPort(config.port) ? config.port : SERVER_PORT;
}

/**
 * Finds the process listening on a port in the TCP table, on IPv4 or IPv6.
 * @param netstat The output of `netstat -ano`.
 * @param port The port.
 * @returns Its process id, or undefined when nothing listens there.
 */
export function listeningPid(netstat: string, port: number): number | undefined {
  for (const line of netstat.split(/\r?\n/)) {
    const [proto, local, foreign, ...rest] = line.trim().split(/\s+/);
    if (proto === "TCP" && local?.endsWith(`:${port}`) && /:0$/.test(foreign ?? "")) {
      const pid = Number(rest.at(-1));
      if (Number.isInteger(pid) && pid > 0) {
        return pid;
      }
    }
  }
  return undefined;
}

/**
 * Tells whether a port is free, binding it on every address as the server does, and letting it go at once.
 * @param port The port.
 * @returns True when it could be bound.
 */
export function portFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", () => resolve(false));
    probe.listen(port, "0.0.0.0", () => probe.close(() => resolve(true)));
  });
}

/**
 * Finds the program holding a port, on Windows.
 * @param port The port.
 * @returns It, or undefined when nothing listens there, the TCP table can't be read or this isn't Windows.
 */
export async function portOwner(port: number): Promise<PortOwner | undefined> {
  if (process.platform !== "win32") {
    return undefined;
  }
  try {
    const pid = listeningPid((await run("netstat", ["-ano"], { windowsHide: true })).stdout, port);
    if (pid === undefined) {
      return undefined;
    }
    const list = await run("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], { windowsHide: true }).catch(() => ({ stdout: "" }));
    return { pid, name: processName(list.stdout) };
  } catch {
    return undefined;
  }
}

/**
 * Reads a program's name from the process list.
 * @param tasklist The output of `tasklist /FO CSV /NH` for one process, e.g. `"node.exe","1234","Console","1","45.000 K"`.
 * @returns The name, e.g. "node.exe", or undefined when the list has no process.
 */
export function processName(tasklist: string): string | undefined {
  return /^"([^"]+)","\d+"/m.exec(tasklist)?.[1];
}

/**
 * Tells whether a value is a port the user may pick.
 * @param value The value, e.g. config.json's port.
 * @returns True for a whole number from MIN_PORT to MAX_PORT.
 */
export function validPort(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_PORT && value <= MAX_PORT;
}
