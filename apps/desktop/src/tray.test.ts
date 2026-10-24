import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { NetworkInterfaceInfo } from "node:os";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { INSTALLER_STARTUP_FILE, takeInstallerStartup } from "./startup.ts";
import { phoneAddress, trayMenu } from "./tray.ts";

/** userData folders of this run, removed at the end. */
const folders: string[] = [];

after(() => folders.forEach((folder) => rmSync(folder, { recursive: true, force: true })));

/**
 * Describes an adapter's address as os.networkInterfaces() does.
 * @param address The address.
 * @param family IPv4 or IPv6.
 * @param internal Whether it is a loopback.
 * @returns The address's info.
 */
function info(address: string, family: "IPv4" | "IPv6" = "IPv4", internal = false): NetworkInterfaceInfo {
  return { address, family, internal, netmask: "", mac: "", cidr: null } as NetworkInterfaceInfo;
}

// Picks the phone's address among a loopback, a virtual machine's adapter, an Ethernet one and the Wi-Fi, and checks
// the Wi-Fi's IPv4 wins, then the Ethernet's without a Wi-Fi, and none without a real network.
test("Desktop: the phone's address is the Wi-Fi's IPv4, never a loopback or a virtual adapter", () => {
  const loopback = { "Loopback Pseudo-Interface 1": [info("127.0.0.1", "IPv4", true), info("::1", "IPv6", true)] };
  const virtual = { "vEthernet (WSL)": [info("172.20.0.1")] };
  const ethernet = { Ethernet: [info("fe80::1", "IPv6"), info("10.0.0.5")] };
  const wifi = { "Wi-Fi": [info("169.254.10.1"), info("192.168.0.202")] };
  assert.equal(phoneAddress({ ...loopback, ...virtual, ...ethernet, ...wifi }), "192.168.0.202");
  assert.equal(phoneAddress({ ...loopback, ...virtual, ...ethernet }), "10.0.0.5");
  assert.equal(phoneAddress({ ...loopback, ...virtual }), undefined);
});

// Lists the tray's menu with a network, the phone's access and starting with Windows on, then without a network or
// starting with Windows, then with the phone's access off, then with the server off, and checks the items and their
// order, the address's label and the check.
test("Desktop: the tray's menu opens the app, shows the phone's address, opens the server's settings and quits", () => {
  assert.deepEqual(trayMenu({ address: "192.168.0.202", port: 3000, serverOn: true, phoneAccess: true, startsWithWindows: true, canStartWithWindows: true }), [
    { id: "open", label: "Abrir o APC" },
    { id: "address", label: "Servidor ligado em http://192.168.0.202:3000 (clique para copiar)", enabled: true },
    { id: "settings", label: "Servidor e banco de dados…" },
    { id: "startup", label: "Iniciar com o Windows", checked: true },
    { id: "separator" },
    { id: "quit", label: "Sair" },
  ]);
  assert.deepEqual(
    trayMenu({ port: 3000, serverOn: true, phoneAccess: true, startsWithWindows: false, canStartWithWindows: false }).map((item) => item.id),
    ["open", "address", "settings", "separator", "quit"],
  );
  assert.deepEqual(trayMenu({ port: 3000, serverOn: true, phoneAccess: true, startsWithWindows: false, canStartWithWindows: false })[1], {
    id: "address",
    label: "Servidor ligado, sem rede para o celular",
    enabled: false,
  });
  assert.deepEqual(trayMenu({ address: "192.168.0.202", port: 3000, serverOn: true, phoneAccess: false, startsWithWindows: false, canStartWithWindows: false })[1], {
    id: "address",
    label: "Servidor ligado só neste computador",
    enabled: false,
  });
  assert.deepEqual(trayMenu({ address: "192.168.0.202", port: 3000, serverOn: false, phoneAccess: true, startsWithWindows: false, canStartWithWindows: false })[1], {
    id: "address",
    label: "Servidor desligado: veja Servidor e banco de dados",
    enabled: false,
  });
});

// Leaves each answer the installer can give, one it can't and none, and checks each is read once and the file removed.
test("Desktop: the installer's answer about starting with Windows is taken once", () => {
  for (const [left, expected] of [["yes\r\n", true], ["no", false], ["maybe", undefined]] as const) {
    const folder = mkdtempSync(path.join(tmpdir(), "apc-startup-"));
    folders.push(folder);
    writeFileSync(path.join(folder, INSTALLER_STARTUP_FILE), left);
    assert.equal(takeInstallerStartup(folder), expected, left);
    assert.equal(existsSync(path.join(folder, INSTALLER_STARTUP_FILE)), false, left);
    assert.equal(takeInstallerStartup(folder), undefined, left);
  }
});
