import type { Page } from "@playwright/test";
import { ENGINE_SHEETS } from "@apc/shared/catalog";

// The Catalog tab: its brands, the models' tree, its searches and the engine sheets.

/**
 * The Catalog tab: a brand, a model and an engine sheet by name, the two searches and the parts a code search finds.
 * @param page The test's page.
 * @returns The tab's elements.
 */
export function catalog(page: Page) {
  return {
    brands: page.getByRole("radio"),
    brand: (name: string) => page.getByRole("radio", { name, exact: true }),
    models: (brand: string) => page.getByRole("tree", { name: `Modelos ${brand}` }),
    model: (name: string) => page.getByRole("treeitem", { name, exact: true }),
    sheet: (key: keyof typeof ENGINE_SHEETS) => page.getByRole("heading", { name: ENGINE_SHEETS[key].title }),
    brandSearch: page.getByRole("searchbox", { name: "Procure marca" }),
    search: page.getByRole("searchbox", { name: "Procure modelo ou código da peça" }),
    parts: page.getByRole("radiogroup", { name: "Peças do estoque com esse código" }),
  };
}
