import { test, type Page } from "@playwright/test";
import { DASHBOARD_TABS } from "@apc/ui-spec/tabs";
import { dialog } from "./common.ts";

// The shell around the tabs: the header, the tab bar, the user menu and its Sobre esta versão; on a phone, the open
// tab's title and the bottom bar.

/**
 * The Dashboard's header, tab bar and content; a tab and its panel are named by the tab's id, so the label is the
 * shared one.
 * @param page The test's page.
 * @returns The Dashboard's elements.
 */
export function dashboard(page: Page) {
  const label = (id: string) => DASHBOARD_TABS.find((tab) => tab.id === id)!.label;
  return {
    heading: page.getByRole("heading", { name: "APC Universal Repair" }),
    mark: page.getByRole("img", { name: "APC Universal Repair" }),
    header: page.locator("header"),
    main: page.getByRole("main"),
    tabs: page.getByRole("tablist", { name: "Seções do Dashboard" }),
    tab: (id: string) => page.getByRole("tab", { name: label(id) }),
    panel: (id: string) => page.getByRole("tabpanel", { name: label(id) }),
    title: (id: string) => page.getByRole("heading", { level: 1, name: label(id) }),
    bar: page.getByTestId("dashboard.bottom-bar"),
  };
}

/**
 * The user menu: its trigger, the menu, and its choices by name. On a phone the trigger is Conta in the bottom bar, and
 * the menu opens in a bottom sheet.
 * @param page The test's page.
 * @returns The menu's elements.
 */
export function userMenu(page: Page) {
  return {
    trigger: page.getByRole("button", { name: /^(Menu do usuário|Conta)$/ }),
    menu: page.getByRole("menu", { name: "Menu do usuário" }),
    // The bottom sheet the menu opens in on a phone.
    sheet: page.getByRole("dialog", { name: "Conta" }),
    item: (name: string) => page.getByRole("menuitem", { name }),
    checkbox: (name: string | RegExp) => page.getByRole("menuitemcheckbox", { name }),
    radio: (name: string) => page.getByRole("menuitemradio", { name }),
  };
}

/**
 * Sobre esta versão, from the user menu: the app's name and version, and a heading of that version's notes.
 * @param page The test's page.
 * @returns The dialog and its parts.
 */
export function aboutDialog(page: Page) {
  const box = dialog(page, "Sobre esta versão");
  return {
    ...box,
    version: (version: string) => box.root.getByText(`APC Universal Repair ${version}`),
    heading: (name: string) => box.root.getByRole("heading", { name, exact: true }),
  };
}

/**
 * Logs out with "Sair" in the user menu.
 * @param page The test's page, on the Dashboard.
 */
export async function logOut(page: Page) {
  await test.step(
    "Log out",
    async () => {
      const menu = userMenu(page);
      await menu.trigger.click();
      await menu.item("Sair").click();
    },
    { box: true },
  );
}
