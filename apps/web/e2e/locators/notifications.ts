import type { Locator, Page } from "@playwright/test";

// The notifications: the bell beside the user menu, its menu of the latest toasts, and its settings; on a phone, Alertas
// in the bottom bar, which opens them as a full screen.

/**
 * The bell, its badge and its menu: the list of the latest notifications and its entries, its clearing, and the
 * toast's time setting.
 * @param page The test's page.
 * @returns The bell's elements.
 */
export function bell(page: Page) {
  const button = page.getByRole("button", { name: /^(Notificações|Alertas)/ });
  const duration = page.getByRole("group", { name: "Tempo do aviso" });
  const list = page.getByRole("list", { name: "Últimas notificações" });
  return {
    button,
    badge: button.getByTestId(/^(notifications\.bell|dashboard\.bottom-bar\.item\.pill)\.badge$/),
    // Named "Notificações", then with the count of unread ones.
    menu: page.getByRole("menu", { name: /^Notificações/ }),
    list,
    entries: list.getByRole("listitem"),
    icon: (entry: Locator) => entry.getByTestId("notifications.menu.list.item.icon"),
    empty: page.getByText("Nenhuma notificação"),
    clear: page.getByRole("menuitem", { name: "Limpar notificações" }),
    screen: page.getByRole("dialog", { name: "Notificações" }),
    settings: page.getByRole("button", { name: "Configurações das notificações" }),
    duration: {
      value: duration.getByRole("status"),
      shorter: duration.getByRole("button", { name: "Diminuir o tempo do aviso" }),
      longer: duration.getByRole("button", { name: "Aumentar o tempo do aviso" }),
    },
  };
}
