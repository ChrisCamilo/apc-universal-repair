import type { Page } from "@playwright/test";
import { DASHBOARD_TABS } from "@apc/shared/tabs";

// The shell around the tabs: the header, the tab bar and the user menu.

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
  };
}

/**
 * The user menu: its trigger, the menu, and its choices by name.
 * @param page The test's page.
 * @returns The menu's elements.
 */
export function userMenu(page: Page) {
  return {
    trigger: page.getByRole("button", { name: "Menu do usuário" }),
    menu: page.getByRole("menu", { name: "Menu do usuário" }),
    item: (name: string) => page.getByRole("menuitem", { name }),
    checkbox: (name: string | RegExp) => page.getByRole("menuitemcheckbox", { name }),
    radio: (name: string) => page.getByRole("menuitemradio", { name }),
  };
}

/**
 * Logs out with "Sair" in the user menu.
 * @param page The test's page, on the Dashboard.
 */
export async function logOut(page: Page) {
  const menu = userMenu(page);
  await menu.trigger.click();
  await menu.item("Sair").click();
}
