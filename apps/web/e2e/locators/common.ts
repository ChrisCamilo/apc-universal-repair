import type { Locator, Page } from "@playwright/test";

// The design system's elements, as the specs find them: a user's way first (role and accessible name, label, text),
// the style id for what has none of its own. Each function takes the page and returns its elements, with no
// assertions, so a renamed label or a moved element is changed here once.

/**
 * What every dialog and form has inside: a button, a field and a choice by name. Names given as text are matched
 * whole, so "Excluir" is never "Excluir…", "Salvar" never "Salvar ficha", and the field "Ano" never the form "Novo ano
 * em RT" around it.
 * @param root The dialog or the form.
 * @returns Its root and its parts by name.
 */
function parts(root: Locator) {
  return {
    root,
    button: (name: string | RegExp) => root.getByRole("button", { name, exact: typeof name === "string" }),
    field: (label: string) => root.getByLabel(label, { exact: true }),
    choice: (name: string) => root.getByRole("radio", { name, exact: true }),
  };
}

/**
 * A dialog or a bottom sheet by its name: a button, a field and a choice by name, its round × and its text "Fechar"
 * button, which some dialogs also have at the bottom. E.g. dialog(page, "Excluir “Kadett”?").button("Excluir").
 * @param page The test's page.
 * @param name The dialog's accessible name, its title.
 * @returns The dialog and its parts.
 */
export function dialog(page: Page, name: string | RegExp) {
  const root = page.getByRole("dialog", { name });
  return {
    ...parts(root),
    close: root.getByRole("button", { name: "Fechar" }).first(),
    closeText: root.getByRole("button", { name: "Fechar" }).filter({ hasText: "Fechar" }),
  };
}

/**
 * The dialogs, bottom sheets and photo viewers open over the page: the native dialogs the role finds, not a tour's
 * card, which has the role too but floats over the page without covering it.
 * @param page The test's page.
 * @returns Every one open.
 */
export function modals(page: Page) {
  return page.getByRole("dialog").and(page.locator("dialog"));
}

/**
 * A form outside a dialog by its name, such as a row that adds or renames something: a button, a field and a choice by
 * name.
 * @param page The test's page.
 * @param name The form's accessible name.
 * @returns The form and its parts.
 */
export function form(page: Page, name: string) {
  return parts(page.getByRole("form", { name }));
}

/**
 * The data table's parts: its rows, the brands' rows under an item among them, its header and its scroll box.
 * @param page The test's page.
 * @returns The table's elements.
 */
export function dataTable(page: Page) {
  return {
    rows: page.getByTestId("common.data-table.table.row"),
    head: page.getByTestId("common.data-table.table.head"),
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
 * The pagination under a list: its pages' navigation, the range it shows by its text ("1–25 de 51", "0 de 0"), a
 * page's button and the page size's choices.
 * @param page The test's page.
 * @param name The pages' navigation's name, e.g. "Páginas do estoque".
 * @returns The pagination's elements.
 */
export function pagination(page: Page, name: string) {
  const pages = page.getByRole("navigation", { name });
  return {
    pages,
    range: (text: string | RegExp) => page.getByTestId("common.pagination").filter({ has: pages }).getByText(text),
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
 * The toasts: their pills, one by its message, and the live regions they are read out in, the alert for errors and
 * warnings.
 * @param page The test's page.
 * @returns The toasts' elements.
 */
export function toasts(page: Page) {
  const messages = page.getByTestId("common.toast.message");
  return {
    messages,
    named: (text: string) => messages.filter({ hasText: text }),
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
  // By its id: a role would also find the dialog the card renders in.
  const card = page.getByTestId("common.tour.card");
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
