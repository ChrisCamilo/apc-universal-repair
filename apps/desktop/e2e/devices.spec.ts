import type { Device } from "@apc/shared/devices";
import { TEST_TAGS } from "@apc/shared/test-tags";
import { TEST_USERS } from "@apc/shared/test-users";
import { expect, logIn, test } from "./support/fixtures.ts";

// Authorizing a device on the server's computer: the compiled app on a stand-in API that lists a phone waiting to be
// authorized, as the API does once the phone logged in with the right password from the Wi-Fi.

/** A phone that logged in and waits to be authorized. */
const PHONE: Device = {
  id: "device-phone",
  username: "ana.souza",
  displayName: "Ana Souza",
  name: "",
  code: "K7Q2ZD",
  status: "pending",
  createdAt: "2026-11-04T21:00:00.000Z",
  approvedAt: null,
  lastUsedAt: null,
  current: false,
};

test.use({ stubDevices: { devices: [PHONE] } });

// Logs in and checks the app asks about the waiting phone, with whose login it is and its code; authorizes it with a
// name, and checks Dispositivos, in the user menu, then lists it by that name.
test("Desktop: a waiting device is authorized on the server's computer", { tag: [TEST_TAGS.auth] }, async ({ launchApp }) => {
  const { app } = await launchApp();
  const page = await app.firstWindow();
  await logIn(page, TEST_USERS[0]);

  const approval = page.getByRole("dialog", { name: "Autorizar este dispositivo?" });
  await expect(approval).toContainText("Ana Souza (ana.souza) quer entrar por um dispositivo novo.");
  await expect(approval.getByText("K7Q2ZD", { exact: true })).toBeVisible();
  await approval.getByLabel("Nome do dispositivo").fill("Celular da Ana");
  await approval.getByRole("button", { name: "Autorizar" }).click();
  await expect(approval).toBeHidden();

  await page.getByRole("button", { name: "Menu do usuário" }).click();
  await page.getByRole("menuitem", { name: "Dispositivos" }).click();
  await expect(page.getByRole("list", { name: "Dispositivos autorizados" })).toContainText("Celular da Ana");
});
