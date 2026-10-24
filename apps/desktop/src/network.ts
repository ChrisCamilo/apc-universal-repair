import { execFile } from "node:child_process";
import { promisify } from "node:util";

// What leaves the server open to others while the phone's access is on: a network in use set to Public, or a firewall
// rule that lets the app in on public networks, as Windows makes one when "Public networks" is ticked on its prompt.
// PowerShell reads both (Get-NetConnectionProfile, and the rules of the app's program from
// Get-NetFirewallApplicationFilter); it only reads, never changes the network or the firewall. Only Windows has them.

/** What PowerShell reports: the networks in use with their profile, and the app's firewall rules. */
export type NetworkReport = {
  profiles: { name: string; category: string }[];
  rules: { name: string; enabled: string; direction: string; action: string; profile: string }[];
};

/** How long the report may take: reading the firewall's rules takes a few seconds. */
const REPORT_TIMEOUT_MS = 20_000;
/** The script that reads the report as JSON, for the program in APC_PROGRAM. */
const SCRIPT = [
  "$profiles = @(Get-NetConnectionProfile | ForEach-Object { @{ name = [string]$_.Name; category = [string]$_.NetworkCategory } })",
  "$rules = @(Get-NetFirewallApplicationFilter -Program $env:APC_PROGRAM -ErrorAction SilentlyContinue | Get-NetFirewallRule | ForEach-Object {",
  "  @{ name = [string]$_.DisplayName; enabled = [string]$_.Enabled; direction = [string]$_.Direction; action = [string]$_.Action; profile = [string]$_.Profile }",
  "})",
  "ConvertTo-Json -Compress -Depth 3 -InputObject @{ profiles = $profiles; rules = $rules }",
].join("\n");

const run = promisify(execFile);

/**
 * Words what in a report leaves the server open on a public network, for the Servidor dialog.
 * @param report What PowerShell reported.
 * @returns A warning, in Portuguese, for each network set to Public, and one for any enabled rule that lets the app in
 * on public networks; none when everything is private.
 */
export function networkWarnings(report: NetworkReport): string[] {
  const networks = report.profiles.filter((network) => network.category === "Public");
  const openRule = report.rules.some(
    (rule) => rule.enabled === "True" && rule.direction === "Inbound" && rule.action === "Allow" && /\b(Public|Any)\b/.test(rule.profile),
  );
  return [
    ...networks.map(
      (network) =>
        `A rede “${network.name}” está como Pública, então quem estiver nela chega ao servidor. Deixe-a como Privada nas configurações de Wi-Fi do Windows (passo 3 do guia do servidor em casa).`,
    ),
    ...(openRule
      ? ["Uma regra do firewall do Windows libera o APC em redes públicas. Deixe-a só para redes privadas (passo 3 do guia do servidor em casa)."]
      : []),
  ];
}

/**
 * Reads PowerShell's report.
 * @param text What the script wrote.
 * @returns The report, or undefined when it isn't one.
 */
export function parseNetworkReport(text: string): NetworkReport | undefined {
  try {
    const parsed = JSON.parse(text) as Partial<NetworkReport>;
    return Array.isArray(parsed.profiles) && Array.isArray(parsed.rules) ? { profiles: parsed.profiles, rules: parsed.rules } : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Reads the networks in use and the app's firewall rules, on Windows.
 * @param program The app's program, whose rules are read, e.g. process.execPath.
 * @returns The report, or undefined when it can't be read or this isn't Windows.
 */
export async function readNetworkReport(program: string): Promise<NetworkReport | undefined> {
  if (process.platform !== "win32") {
    return undefined;
  }
  try {
    const { stdout } = await run(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(SCRIPT, "utf16le").toString("base64")],
      { env: { ...process.env, APC_PROGRAM: program }, timeout: REPORT_TIMEOUT_MS, windowsHide: true },
    );
    return parseNetworkReport(stdout.trim());
  } catch {
    return undefined;
  }
}
