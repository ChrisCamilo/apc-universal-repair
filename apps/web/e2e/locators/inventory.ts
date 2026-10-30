import type { Locator, Page } from "@playwright/test";
import { dialog, pagination } from "./common.ts";

// The Inventory tab: its toolbar and search, the list's states, and its dialogs (the item form and details, Manage
// lists, the filters, the import and the delete confirmation).

/**
 * One of the Inventory's other actions: a button of the desktop's toolbar, or on a phone a row of the sheet the
 * header's "⋯" opens. Its click opens the sheet first when the "⋯" is there.
 * @param page The test's page.
 * @param name The action, e.g. "Importar CSV".
 * @returns The action, to click.
 */
function otherAction(page: Page, name: string) {
  const button = page.getByRole("button", { name, exact: true });
  const more = page.getByRole("button", { name: "Mais ações" });
  return {
    async click() {
      await button.or(more).first().waitFor();
      if (await more.isVisible()) {
        await more.click();
      }
      await button.click();
    },
  };
}

/**
 * The Inventory tab: its panel, toolbar, search, filters, counter, list states and pagination, and an item's row
 * buttons by the item's name.
 * @param page The test's page.
 * @returns The tab's elements.
 */
export function inventory(page: Page) {
  const body = page.getByTestId("inventory.inventory-tab.body");
  return {
    // The panel holding the tab's body; panels nest, so the innermost is the last.
    panel: page.getByTestId("common.panel").filter({ has: body }).last(),
    body,
    table: page.getByRole("table", { name: "Itens do estoque" }),
    toolbar: page.getByTestId("inventory.inventory-tab.toolbar"),
    searchBox: page.getByTestId("inventory.inventory-tab.search"),
    search: page.getByRole("searchbox", { name: "Procure pelo nome ou código da peça" }),
    clearSearch: page.getByRole("button", { name: "Limpar busca" }),
    // The toolbar's, and the empty list's when there is one.
    newItem: page.getByRole("button", { name: "Novo item" }),
    // Named "Filtros", then with the count of active filters, e.g. "Filtros, 1 ativo".
    filters: page.getByRole("button", { name: /^Filtros/ }),
    // A phone's round Ordenar, named with the sort on, e.g. "Ordenar, Local (A → Z)".
    sort: page.getByRole("button", { name: /^Ordenar(, .+)?$/ }),
    // The toolbar's, and the empty search's when there is one.
    clearFilters: page.getByRole("button", { name: "Limpar filtros" }),
    // On a phone the chips name their counts in short: "Baixo · 5", "Esgotado · 4".
    lowStock: page.getByRole("button", { name: /^(Estoque baixo|Baixo · \d+)$/ }),
    outOfStock: page.getByRole("button", { name: /^Esgotado( · \d+)?$/ }),
    // A phone's card: the stock status under its quantity ("un.", "Baixo", "Esgotado").
    status: (row: Locator) => row.getByTestId("inventory.inventory-tab.quantity.tag"),
    // The toolbar's, or on a phone the "⋯" sheet's, which opens first.
    manageLists: otherAction(page, "Gerenciar listas"),
    importCsv: otherAction(page, "Importar CSV"),
    exportCsv: otherAction(page, "Exportar CSV"),
    // A phone's "⋯" in the header and the sheet it opens.
    more: page.getByRole("button", { name: "Mais ações" }),
    moreSheet: dialog(page, "Mais ações").root,
    count: page.getByTestId("inventory.inventory-tab.filters.count"),
    loadingRows: page.getByTestId("inventory.inventory-tab.loading.row"),
    loading: page.getByRole("status", { name: "Carregando o estoque" }),
    failed: page.getByRole("alert").filter({ hasText: "Não foi possível carregar o estoque" }),
    nothingFound: page.getByRole("heading", { name: "Nenhum item encontrado" }),
    empty: page.getByRole("heading", { name: "Nenhum item cadastrado" }),
    edit: (name: string) => page.getByRole("button", { name: `Editar ${name}` }),
    remove: (name: string) => page.getByRole("button", { name: `Excluir ${name}` }),
    photos: (name: string) => page.getByRole("button", { name: `Ver fotos de ${name}` }),
    pager: pagination(page, "Páginas do estoque"),
    // A phone's list end once every item is in, in place of the pagination.
    listEnd: page.getByText("Fim da lista", { exact: true }),
  };
}

/**
 * The item form, "Novo item" or "Editar item": its fields, its photos and its buttons.
 * @param page The test's page.
 * @param title The form's title.
 * @returns The form's elements.
 */
export function itemForm(page: Page, title: "Novo item" | "Editar item") {
  const { root, close } = dialog(page, title);
  return {
    root,
    close,
    code: root.getByLabel("Código da peça"),
    name: root.getByLabel("Nome"),
    category: root.getByRole("combobox", { name: "Categoria" }),
    partBrand: root.getByRole("combobox", { name: "Marca da peça" }),
    vehicleBrand: root.getByRole("combobox", { name: "Marca do veículo" }),
    vehicleModel: root.getByRole("combobox", { name: "Modelo do veículo" }),
    unitPrice: root.getByLabel("Valor unitário (R$)"),
    quantity: root.getByLabel("Quantidade", { exact: true }),
    location: root.getByLabel("Local"),
    photos: root.getByRole("img", { name: /^Foto \d/ }),
    removePhoto: (number: number) => root.getByRole("button", { name: `Remover foto ${number}` }),
    photoFile: root.getByTestId("common.image-upload.drop.input"),
    // "Salvar", or "Salvar alterações" when the form was opened from the item's details.
    save: root.getByRole("button", { name: "Salvar" }),
    cancel: root.getByRole("button", { name: "Cancelar" }),
  };
}

/** The fields fillItem types: the ones a new item needs. */
type NewItem = { code: string; name: string; category: string; partBrand: string; vehicleBrand: string; unitPrice: string };

/**
 * Types an item's required fields in the item form, as the user writes them; the names are typed, not picked.
 * @param page The test's page, with the form open.
 * @param title The form's title.
 * @param item The fields to type.
 */
export async function fillItem(page: Page, title: "Novo item" | "Editar item", item: NewItem) {
  const form = itemForm(page, title);
  await form.code.fill(item.code);
  await form.name.fill(item.name);
  await form.category.fill(item.category);
  await form.partBrand.fill(item.partBrand);
  await form.vehicleBrand.fill(item.vehicleBrand);
  await form.unitPrice.fill(item.unitPrice);
}

/**
 * An item's details, opened from its row: its fields by group name and its buttons.
 * @param page The test's page.
 * @returns The details' elements.
 */
export function itemDetails(page: Page) {
  const { root, closeText } = dialog(page, "Detalhes do item");
  return {
    root,
    closeText,
    field: (name: string) => root.getByRole("group", { name, exact: true }),
    edit: root.getByRole("button", { name: "Editar" }),
    duplicate: root.getByRole("button", { name: "Duplicar" }),
  };
}

/**
 * The confirmation before an item is deleted.
 * @param page The test's page.
 * @returns The dialog and its buttons.
 */
export function deleteDialog(page: Page) {
  const root = page.getByRole("dialog", { name: "Excluir item?" });
  return {
    root,
    confirm: root.getByRole("button", { name: "Excluir" }),
    cancel: root.getByRole("button", { name: "Cancelar" }),
  };
}

/**
 * Deletes an item from its row's trash button and confirms.
 * @param page The test's page.
 * @param name The item's name.
 */
export async function deleteItem(page: Page, name: string) {
  await inventory(page).remove(name).click();
  await deleteDialog(page).confirm.click();
}

/**
 * Manage lists: its sections by name, e.g. "Categorias", an entry's buttons and rename field, and the notice that an
 * entry in use can't be deleted.
 * @param page The test's page.
 * @returns The dialog's elements.
 */
export function manageLists(page: Page) {
  const { root, close, closeText } = dialog(page, "Gerenciar listas");
  const section = (name: string) => root.getByRole("region", { name });
  const inUse = page.getByRole("dialog", { name: "Não é possível excluir" });
  return {
    root,
    close,
    closeText,
    section,
    remove: (name: string, entry: string) => section(name).getByRole("button", { name: `Excluir ${entry}` }),
    rename: (name: string, entry: string) => section(name).getByRole("button", { name: `Renomear ${entry}` }),
    newName: (entry: string) => root.getByLabel(`Novo nome de “${entry}”`),
    inUse,
    showItems: inUse.getByRole("button", { name: "Ver itens" }),
  };
}

/**
 * The Filtros menu, or on a phone the "Filtrar e ordenar" sheet: a field by name (the desktop's select, or the sheet's
 * row that opens its options, named with its choice), the desktop's chips, the sheet's segments, "Ordenar por",
 * "Limpar" and the button that applies ("Aplicar", or "Ver n itens").
 * @param page The test's page.
 * @returns The menu's elements.
 */
export function filtersMenu(page: Page) {
  const root = page.getByRole("dialog", { name: /^(Filtros do estoque|Filtrar e ordenar)$/ });
  return {
    root,
    field: (name: string) => root.getByRole("combobox", { name }).or(root.getByRole("button", { name: new RegExp(`^${name} `) })),
    chip: (name: string) => root.getByRole("button", { name }),
    segment: (group: string, name: string) => root.getByRole("radiogroup", { name: group }).getByRole("radio", { name }),
    sort: root.getByRole("button", { name: /^Ordenar por / }),
    clear: root.getByRole("button", { name: "Limpar", exact: true }),
    apply: root.getByRole("button", { name: /^(Aplicar|Ver \d+ ite(m|ns))$/ }),
  };
}

/**
 * The CSV import: the file field, the preview's rows and the button that imports.
 * @param page The test's page.
 * @returns The dialog's elements.
 */
export function importDialog(page: Page) {
  const root = page.getByRole("dialog", { name: "Importar CSV" });
  return {
    root,
    file: root.getByLabel("Arquivo CSV"),
    template: root.getByRole("button", { name: "Baixar modelo" }),
    rows: root.getByTestId("inventory.import-items-dialog.preview.row"),
    submit: (count: number) => root.getByRole("button", { name: `Importar ${count} itens` }),
  };
}
