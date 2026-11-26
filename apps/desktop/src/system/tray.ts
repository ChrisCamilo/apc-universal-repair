import type { NetworkInterfaceInfo } from "node:os";
import { texts } from "../texts.ts";

// The tray icon of the app that runs its own server (see bundledServer.ts): closing the window hides it there, so the
// server stays on, for the phone when its access is on. Its menu opens the app, shows the address the phone reaches
// the server at (a click copies it), that it answers only this computer while the phone's access is off, or that the
// server is off, opens the server's settings (see serverSettings.ts), turns starting with Windows on and off for the
// installed app, and quits, which turns the server off.

/** Adapters that aren't the computer's network: virtual machines', WSL's and VPN tunnels'. */
const VIRTUAL = /vEthernet|VirtualBox|VMware|Hyper-V|WSL|Loopback|Bluetooth|Tailscale|ZeroTier|VPN/i;
/** Adapters the phone usually shares: the Wi-Fi first. */
const WIFI = /Wi-?Fi|WLAN|Wireless|Sem fio/i;

/** One item of the tray's menu, by what it does; main.ts gives each its action. */
export type TrayItem =
  | { id: "open" | "quit" | "settings"; label: string }
  | { id: "address"; label: string; enabled: boolean }
  | { id: "startup"; label: string; checked: boolean }
  | { id: "separator" };

/**
 * Picks the address the phone reaches this computer at: an IPv4 address of a real adapter, the Wi-Fi's first, never a
 * loopback, link-local or virtual one.
 * @param interfaces The computer's network interfaces, as os.networkInterfaces() gives them.
 * @returns The address, e.g. "192.168.0.10", or undefined when the computer has no network.
 */
export function phoneAddress(interfaces: NodeJS.Dict<NetworkInterfaceInfo[]>): string | undefined {
  const candidates = Object.entries(interfaces).flatMap(([name, addresses]) =>
    VIRTUAL.test(name)
      ? []
      : (addresses ?? [])
          .filter(({ family, internal, address }) => family === "IPv4" && !internal && !address.startsWith("169.254."))
          .map(({ address }) => ({ name, address })),
  );
  return (candidates.find(({ name }) => WIFI.test(name)) ?? candidates[0])?.address;
}

/**
 * Lists the tray's menu items, in order.
 * @param state The phone's address, the server's port, whether it is on and whether the phone's access is, and whether
 * starting with Windows is on and can be changed (only for the installed app).
 * @returns The items, in the main process's language.
 */
export function trayMenu(state: {
  address?: string;
  port: number;
  serverOn: boolean;
  phoneAccess: boolean;
  startsWithWindows: boolean;
  canStartWithWindows: boolean;
}): TrayItem[] {
  const words = texts().tray;
  const address: TrayItem = !state.serverOn
    ? { id: "address", label: words.off, enabled: false }
    : !state.phoneAccess
      ? { id: "address", label: words.local, enabled: false }
      : state.address
        ? { id: "address", label: words.address(`https://${state.address}:${state.port}`), enabled: true }
        : { id: "address", label: words.noNetwork, enabled: false };
  return [
    { id: "open", label: words.open },
    address,
    { id: "settings", label: words.settings },
    ...(state.canStartWithWindows ? [{ id: "startup", label: words.startup, checked: state.startsWithWindows } as const] : []),
    { id: "separator" },
    { id: "quit", label: words.quit },
  ];
}
