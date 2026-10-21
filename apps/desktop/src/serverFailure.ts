import type { PortOwner } from "./ports.ts";

// Why the server the app runs isn't on, in words the window shows (see serverSettings.ts) instead of a login that only
// fails: the SQLite key that doesn't open with this Windows user, its port held by another program, named when the
// system says which (see ports.ts), a server that kept stopping as it started, or one that didn't answer in time; for
// the last two, the last error the server wrote to logs/api.log, which also gives where to look.

/** What kept the server off: its key, its port held by another program, its repeated stops, or no answer in time. */
export type FailureKind = "key" | "portInUse" | "stopped" | "timeout";
/** What the window shows when the server isn't on: what kept it off, why in words, and the log to look at. */
export type ServerFailure = { kind: FailureKind; reason: string; log: string };

/**
 * Words why the server isn't on.
 * @param kind What kept it off.
 * @param logText The end of logs/api.log, where the server wrote its errors.
 * @param log The log's path, shown to look at.
 * @param taken For a taken port: the port, and the program holding it when the system says which.
 * @returns What kept it off, the reason and the log.
 */
export function serverFailure(
  kind: FailureKind,
  logText: string,
  log: string,
  taken?: { port: number; owner?: PortOwner },
): ServerFailure {
  if (kind === "portInUse") {
    const holder = taken?.owner ? `pelo programa ${taken.owner.name ?? "sem nome"} (processo ${taken.owner.pid})` : "por outro programa";
    const reason = `A porta ${taken?.port} já está em uso ${holder}. Feche esse programa e tente de novo, ou use outra porta.`;
    return { kind, reason, log };
  }
  const reasons: Record<Exclude<FailureKind, "portInUse">, string> = {
    key: "A chave do banco SQLite guardada neste computador não abre com este usuário do Windows.",
    stopped: "O servidor parou ao ligar, várias vezes seguidas.",
    timeout: "O servidor não respondeu a tempo.",
  };
  const error = kind === "key" ? undefined : lastServerError(logText);
  return { kind, reason: error ? `${reasons[kind]} Último erro: ${error}` : reasons[kind], log };
}

/**
 * Finds the last error the server wrote since it last started: an error line of its JSON log, or a line a crash
 * printed, such as "Error: Cannot find module …".
 * @param logText The end of logs/api.log.
 * @returns The error's message, or undefined when there is none.
 */
export function lastServerError(logText: string): string | undefined {
  const lines = logText.split(/\r?\n/);
  const start = lines.map((line) => line.endsWith("Starting the server.")).lastIndexOf(true);
  for (const line of lines.slice(start + 1).reverse()) {
    if (line.startsWith("{")) {
      try {
        const entry = JSON.parse(line) as { level?: number; msg?: string; err?: { message?: string } };
        if ((entry.level ?? 0) >= 50) {
          return entry.err?.message ?? entry.msg;
        }
      } catch {
        // A line cut short isn't an error.
      }
    } else {
      const crash = /^\s*(\w*Error): (.+)$/.exec(line);
      if (crash) {
        return `${crash[1]}: ${crash[2]}`;
      }
    }
  }
  return undefined;
}
