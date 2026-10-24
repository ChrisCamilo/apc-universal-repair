import assert from "node:assert/strict";
import { createServer } from "node:net";
import { test } from "node:test";
import { LOCAL_HOST, NETWORK_HOST } from "./bundledServer.ts";
import { configuredPort, listeningPid, portFree, processName, serverHosts, validPort } from "./ports.ts";

// The TCP table of a Windows in Portuguese, its states written in the system's language, with a program listening on
// 3000 over IPv6 and a connection that only goes out from another port 3000.
const NETSTAT = `
Conexões ativas

  Proto  Endereço local         Endereço externo       Estado           PID
  TCP    0.0.0.0:135            0.0.0.0:0              ESCUTANDO       2196
  TCP    192.168.0.10:51000     52.1.2.3:3000          ESTABELECIDA    7000
  TCP    [::]:3000              [::]:0                 ESCUTANDO       4321
  UDP    0.0.0.0:3000           *:*                                    999
`;

// Reads config.json's port, and checks a missing one, one out of range, a fraction or text gives the default 3000.
test("Desktop: the server's port comes from config.json, or is 3000", () => {
  assert.equal(configuredPort({ port: 3100 }), 3100);
  for (const port of [undefined, 80, 70000, 3000.5, "3100"]) {
    assert.equal(configuredPort({ port } as never), 3000);
  }
  assert.deepEqual([validPort(1024), validPort(65535), validPort(1023), validPort(65536)], [true, true, false, false]);
});

// Finds who listens on a port in the TCP table, and checks a connection going out to that port, a UDP socket and a
// port nobody listens on give none; and reads the program's name from the process list.
test("Desktop: the program holding a port is read from the TCP table", () => {
  assert.equal(listeningPid(NETSTAT, 3000), 4321);
  assert.equal(listeningPid(NETSTAT, 135), 2196);
  assert.equal(listeningPid(NETSTAT, 51000), undefined);
  assert.equal(listeningPid(NETSTAT, 4000), undefined);
  assert.equal(processName('"node.exe","4321","Console","1","45.000 K"\r\n'), "node.exe");
  assert.equal(processName("INFORMAÇÕES: Nenhuma tarefa em execução corresponde aos critérios especificados.\r\n"), undefined);
});

// Holds a port on this computer's address and checks it isn't free there while held, for the server with the phone's
// access off or on, and is once let go.
test("Desktop: a port is free only while no program holds it", async () => {
  const holder = createServer();
  await new Promise<void>((resolve) => holder.listen(0, LOCAL_HOST, resolve));
  const { port } = holder.address() as { port: number };
  assert.equal(await portFree(port, serverHosts(false)), false);
  assert.equal(await portFree(port, serverHosts(true)), false);
  await new Promise((resolve) => holder.close(resolve));
  assert.equal(await portFree(port, serverHosts(false)), true);
});

// Holds a port on every address and checks the server with the phone's access off still finds it free on this
// computer's address, without trying every address, while with the access on it doesn't. Only Windows lets the two
// share a port; Linux, where CI runs, refuses the second.
test("Desktop: a port held on every address is free for a server on this computer only", { skip: process.platform !== "win32" }, async () => {
  const holder = createServer();
  await new Promise<void>((resolve) => holder.listen(0, NETWORK_HOST, resolve));
  const { port } = holder.address() as { port: number };
  try {
    assert.deepEqual(serverHosts(false), [LOCAL_HOST]);
    assert.equal(await portFree(port, serverHosts(false)), true);
    assert.equal(await portFree(port, serverHosts(true)), false);
  } finally {
    await new Promise((resolve) => holder.close(resolve));
  }
});
