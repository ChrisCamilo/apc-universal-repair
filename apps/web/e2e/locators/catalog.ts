import type { Page } from "@playwright/test";
import { TEST_CATALOG, TEST_ENGINES } from "@apc/domain/test-catalog";

// The Catalog tab: its brands, the models' tree, its searches and the engine sheets; on a phone, the brand lines, the
// screen's title and its ←, and the parts a code search found as cards.

/**
 * The Catalog tab: a brand, a model and an engine sheet by name, the two searches and the parts a code search finds;
 * on a phone, a brand's line, the screen's title, its ← by name and the found parts' cards.
 * @param page The test's page.
 * @returns The tab's elements.
 */
export function catalog(page: Page) {
  return {
    brands: page.getByRole("radio"),
    brand: (name: string, exact?: boolean) => page.getByRole("radio", { name, exact }),
    models: (brand: string) => page.getByRole("tree", { name: `Modelos ${brand}` }),
    model: (name: string, exact?: boolean) => page.getByRole("treeitem", { name, exact }),
    sheet: (key: keyof typeof TEST_ENGINES) => page.getByRole("heading", { name: TEST_CATALOG.sheets[TEST_ENGINES[key]].title }),
    brandSearch: page.getByRole("searchbox", { name: "Procure marca" }),
    search: page.getByRole("searchbox", { name: "Procure modelo ou código da peça" }),
    parts: page.getByRole("radiogroup", { name: "Peças do estoque com esse código" }),
    brandLines: page.getByTestId("catalog.catalog-tab.screen.brands.brand"),
    brandLine: (name: string) => page.getByRole("button", { name: new RegExp(`^${name} `) }),
    title: page.getByRole("heading", { level: 1 }),
    back: (name: string) => page.getByRole("button", { name }),
    partCards: page.getByRole("table", { name: "Peças do estoque com esse código" }).getByRole("row"),
  };
}
