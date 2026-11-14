import type { Device } from "@apc/domain/devices";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { TEST_USERS } from "@apc/domain/test-users";
import { expect, logIn, test } from "./support/fixtures.ts";
import { userMenu } from "../../web/e2e/locators/dashboard.ts";
import { devices } from "../../web/e2e/locators/setup.ts";

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

  const { approval, authorized } = devices(page);
  await expect(approval.root).toContainText("Ana Souza (ana.souza) quer entrar por um dispositivo novo.");
  await expect(approval.code("K7Q2ZD")).toBeVisible();
  await approval.name.fill("Celular da Ana");
  await approval.approve.click();
  await expect(approval.root).toBeHidden();

  const menu = userMenu(page);
  await menu.trigger.click();
  await menu.item("Dispositivos").click();
  await expect(authorized).toContainText("Celular da Ana");
});
