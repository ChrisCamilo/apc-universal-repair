import type { Locator, Page } from "@playwright/test";

// The design system's elements, as the specs find them: a user's way first (role and accessible name, label, text),
// the style id for what has none of its own. Each function takes the page and returns its elements, with no
// assertions, so a renamed label or a moved element is changed here once.

/**
 * A dialog by its name, with its round × and its text "Fechar" button, which some dialogs also have at the bottom.
 * @param page The test's page.
 * @param name The dialog's accessible name, its title.
 * @returns The dialog and its close buttons.
 */
export function dialog(page: Page, name: string | RegExp) {
  const root = page.getByRole("dialog", { name });
  return {
    root,
    close: root.getByRole("button", { name: "Fechar" }).first(),
    closeText: root.getByRole("button", { name: "Fechar" }).filter({ hasText: "Fechar" }),
  };
}

/**
 * The data table's parts: its rows, the brands' rows under an item among them, its header and its scroll box.
 * @param page The test's page.
 * @returns The table's elements.
 */
export function dataTable(page: Page) {
  return {
    rows: page.getByTestId("common.data-table.row"),
    head: page.getByTestId("common.data-table.head"),
    header: (name: string | RegExp) => page.getByRole("columnheader", { name }),
    scroll: page.getByTestId("common.data-table.scroll"),
    sort: page.getByRole("combobox", { name: "Ordenar" }),
  };
}

/**
 * A row's thumbnail image, the picture inside its "Ver fotos de …" button.
 * @param thumbnail The thumbnail's button.
 * @returns The image it shows.
 */
export function thumbnailImage(thumbnail: Locator): Locator {
  return thumbnail.getByTestId("common.table-thumbnail.image");
}

/**
 * The pagination under a list: its pages' navigation, a page's button and the page size's choices.
 * @param page The test's page.
 * @param name The pages' navigation's name, e.g. "Páginas do estoque".
 * @returns The pagination's elements.
 */
export function pagination(page: Page, name: string) {
  const pages = page.getByRole("navigation", { name });
  return {
    pages,
    page: (number: number) => pages.getByRole("button", { name: `Página ${number}` }),
    size: (size: number) => page.getByRole("radiogroup", { name: "Itens por página" }).getByRole("radio", { name: String(size), exact: true }),
  };
}

/**
 * The options of the open combobox or select, which the page draws outside the field.
 * @param page The test's page.
 * @returns Every option, and one by its name.
 */
export function options(page: Page) {
  return {
    all: page.getByRole("option"),
    named: (name: string | RegExp, exact?: boolean) => page.getByRole("option", { name, exact }),
  };
}

/**
 * The toasts: their pills, and the live regions they are read out in, the alert for errors and warnings.
 * @param page The test's page.
 * @returns The toasts' elements.
 */
export function toasts(page: Page) {
  return {
    messages: page.getByTestId("common.toast.message"),
    urgent: page.getByRole("alert"),
    polite: page.getByRole("status"),
  };
}

/**
 * A guided tour's card and its buttons, and the spotlight over the step's target.
 * @param page The test's page.
 * @returns The tour's elements; step(title) is the card's heading for a step.
 */
export function tour(page: Page) {
  const card = page.getByRole("dialog").filter({ hasText: /\d+ \/ \d+/ });
  return {
    card,
    step: (title: string) => card.getByRole("heading", { name: title }),
    doIt: card.getByRole("button", { name: "Fazer por mim" }),
    next: card.getByRole("button", { name: "Próximo" }),
    done: card.getByRole("button", { name: "Concluir" }),
    skip: page.getByRole("button", { name: "Pular tutorial" }),
    spotlight: page.getByTestId("common.tour.spotlight"),
  };
}
