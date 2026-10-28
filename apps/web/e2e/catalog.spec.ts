import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/shared/test-tags";
import { catalog } from "./locators/catalog.ts";
import { dashboard } from "./locators/dashboard.ts";
import type { Item } from "@apc/shared/items";
import { DASHBOARD_TABS } from "@apc/shared/tabs";
import { item } from "./data/items.ts";

// The inventory the code search looks in: a part for an engine the catalog has, and one for a model it has no sheet
// for.
const ITEMS: Item[] = [
  item({ code: "FRA-1000", name: "Pastilha de freio dianteira", vehicleBrand: "Chevrolet", vehicleModel: "Opala 4.1" }),
  item({ code: "ESC-200", name: "Amortecedor", vehicleBrand: "Ford", vehicleModel: "Escort" }),
];

// While the Catalog tab is a work in progress its screen sits out of reach behind the notice, so these tests wait for
// it to come back; the notice itself is tested in dashboard.spec.ts.
test.skip(DASHBOARD_TABS.some((tab) => tab.id === "catalog" && tab.wip), "The Catalog tab is a work in progress (#151)");
// The issue that brings the Catalog back, shown with each of its tests in the report.
const CATALOG_ISSUE = { type: "issue", description: "https://github.com/ChrisCamilo/apc-universal-repair/issues/151" };

// Every test here starts on the Dashboard with the test inventory.
test.use({ stock: { items: ITEMS } });

// Opens the Catalog tab and checks it starts on Chevrolet with its first engine's sheet, then picks the other Opala
// engine, Fiat and Ford, and checks the sheet follows each choice, Ford saying it has no sheet yet. Nothing scrolls
// sideways at either screen size.
test("Web: the Catalog browses brands, models and engine sheets", { tag: [TEST_TAGS.catalog], annotation: CATALOG_ISSUE }, async ({ page }) => {
  const tab = catalog(page);
  await page.goto("/inventory");
  await dashboard(page).tab("catalog").click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(tab.brand("Chevrolet", true)).toBeChecked();
  await expect(tab.sheet("chevrolet-opala-diplomata-1986-2.5")).toBeVisible();

  await tab.model("4.1 L 6 cilindros").click();
  await expect(tab.sheet("chevrolet-opala-diplomata-1986-4.1")).toBeVisible();

  await tab.brand("Fiat").click();
  await expect(tab.models("Fiat")).toBeVisible();
  await expect(tab.sheet("fiat-uno-mille-1991-1.0")).toBeVisible();

  await tab.brand("Ford").click();
  await expect(page.getByText("Nenhuma ficha cadastrada")).toBeVisible();
  await expect(page).not.toScrollSideways();
});

// Narrows the brands by name, looks for a model another brand has, then types a part code without its separator and
// checks the part is listed and reveals its vehicle, and a part for a model without a sheet says so; clearing the
// search drops the part list.
test("Web: the Catalog search finds brands, models and inventory parts", { tag: [TEST_TAGS.catalog], annotation: CATALOG_ISSUE }, async ({ page }) => {
  const tab = catalog(page);
  await page.goto("/catalog");
  await tab.brandSearch.fill("fia");
  await expect(tab.brands).toHaveCount(1);
  await tab.brandSearch.fill("");

  await tab.search.fill("gol");
  await expect(tab.brand("Volkswagen", true)).toBeChecked();
  await expect(tab.sheet("volkswagen-gol-gts-1989-1.8")).toBeVisible();

  await tab.search.fill("fra1000");
  await expect(tab.parts.getByRole("radio")).toHaveCount(1);
  await expect(tab.parts).toContainText("Serve no Chevrolet Opala 4.1");
  await expect(tab.brand("Chevrolet", true)).toBeChecked();
  await expect(tab.model("Opala", true)).toHaveAttribute("aria-current", "true");
  await expect(tab.sheet("chevrolet-opala-diplomata-1986-4.1")).toBeVisible();

  await tab.search.fill("esc200");
  await expect(page.getByText("Ford Escort", { exact: true })).toBeVisible();
  await tab.search.fill("");
  await expect(tab.parts).toBeHidden();
  await expect(page).not.toScrollSideways();
});
