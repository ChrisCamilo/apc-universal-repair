import type { Locator, Page } from "@playwright/test";

// The notifications: the bell beside the user menu, its menu of the latest toasts, and its settings.

/**
 * The bell, its badge and its menu: the list of the latest notifications, its clearing, and the toast's time setting.
 * @param page The test's page.
 * @returns The bell's elements.
 */
export function bell(page: Page) {
  const button = page.getByRole("button", { name: /^Notificações/ });
  const duration = page.getByRole("group", { name: "Tempo do aviso" });
  return {
    button,
    badge: button.getByTestId("notifications.bell.badge"),
    entries: page.getByRole("list", { name: "Últimas notificações" }).getByRole("listitem"),
    icon: (entry: Locator) => entry.getByTestId("notifications.menu.list.item.icon"),
    empty: page.getByText("Nenhuma notificação"),
    clear: page.getByRole("menuitem", { name: "Limpar notificações" }),
    settings: page.getByRole("button", { name: "Configurações das notificações" }),
    duration: {
      value: duration.getByRole("status"),
      shorter: duration.getByRole("button", { name: "Diminuir o tempo do aviso" }),
      longer: duration.getByRole("button", { name: "Aumentar o tempo do aviso" }),
    },
  };
}
