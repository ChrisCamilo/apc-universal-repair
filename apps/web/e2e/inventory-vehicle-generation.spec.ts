import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import type { Item } from "@apc/domain/items";
import { TABLE_CARD_BREAKPOINT } from "@apc/ui-spec/table";
import { dataTable, options, toasts } from "./locators/common.ts";
import { filtersMenu, inventory, itemDetails, itemForm } from "./locators/inventory.ts";
import { savedItem, serveItems } from "./stubs/items.ts";
import { item } from "./data/items.ts";

// The API answers GET /items with these items, newest first: two filters for the Gol, one of them for its G5 only.
const ITEMS: Item[] = [
  item({ code: "W 712/95", name: "Filtro de óleo", category: "Motor", partBrand: "Mann", vehicleBrand: "Volkswagen", vehicleModel: "Gol" }),
  item({
    code: "C 2433",
    name: "Filtro de ar",
    category: "Motor",
    partBrand: "Mann",
    vehicleBrand: "Volkswagen",
    vehicleModel: "Gol",
    firstYear: 2008,
    lastYear: 2012,
    version: "1.0 G5",
  }),
];

// Adds an item for one generation and version of the Gol and filters by them: they are the vehicle's, kept apart from
// the item's name and row, and the Geração and Versão do veículo filters each wait for the filters before them (the
// vehicle's brand, then its model, then its generation).
test("Web: a vehicle's generation and version are saved, shown in the details and filtered", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const stock = [...ITEMS];
  await page.route("**/api/items", async (route) => {
    const saved = savedItem(route.request().postDataJSON());
    stock.unshift(saved);
    return route.fulfill({ status: 201, json: saved });
  });
  await serveItems(page, stock);
  await page.goto("/inventory");
  const { rows } = dataTable(page);
  await expect(rows).toHaveCount(2);

  const phone = (page.viewportSize()?.width ?? 0) < TABLE_CARD_BREAKPOINT;
  await test.step("the item is saved with a generation picked from the stock's and a typed version, both out of its name and row", async () => {
    const form = itemForm(page, "Novo item");
    await inventory(page).newItem.click();
    await form.code.fill("ba-30");
    await form.name.fill("Bieleta");
    await form.category.fill("Motor");
    await form.partBrand.fill("Mann");
    if (phone) {
      await form.addVehicle.click();
    }
    // Each list is closed before the next field, which a phone's open list covers.
    await form.vehicleBrand.fill("Volkswagen");
    await form.vehicleBrand.press("Escape");
    await form.vehicleModel.fill("Gol");
    await form.vehicleModel.press("Escape");
    await form.generation.click();
    await options(page).named("08/12", true).click();
    await form.version.fill("1.0 G5");
    await form.version.press("Escape");
    if (phone) {
      await form.confirmVehicle.click();
      await expect(form.vehicle("Volkswagen Gol 08/12 1.0 G5")).toBeVisible();
    }
    await form.unitPrice.fill("49,9");
    await form.save.click();
    await expect(toasts(page).named("Item “Bieleta” cadastrado.")).toBeVisible();
    await expect(rows).toHaveCount(3);
    await expect(rows.first()).toContainText("Bieleta");
    await expect(rows.first()).not.toContainText("08/12");
  });

  await test.step("its details show the generation and the version", async () => {
    await rows.first().getByText("Bieleta").click();
    const details = itemDetails(page);
    await expect(details.root.getByText("Volkswagen Gol 08/12 1.0 G5")).toBeVisible();
    await (phone ? details.back : details.closeText).click();
  });

  await test.step("the Geração and Versão do veículo filters narrow the list to the items with them", async () => {
    /** Applies a value of each of some filters of the Filtros menu, chosen in their order. */
    const filterBy = async (choices: [filter: string, value: string][]) => {
      await inventory(page).filters.click();
      const menu = filtersMenu(page);
      for (const [filter, value] of choices) {
        await menu.field(filter).click();
        await options(page).named(value, true).click();
        // A phone's list goes back to the sheet's rows by its ←; the desktop's closes.
        await (phone ? page.getByRole("button", { name: "Voltar aos filtros" }).click() : page.keyboard.press("Escape"));
      }
      await menu.apply.click();
    };
    const gol: [string, string][] = [
      ["Marca do veículo", "Volkswagen"],
      ["Modelo do veículo", "Gol · Volkswagen"],
      ["Geração", "08/12"],
    ];
    await filterBy(gol);
    await expect(rows).toHaveCount(2);
    await expect(rows.filter({ hasText: "Filtro de óleo" })).toHaveCount(0);
    await inventory(page).clearFilters.click();
    await filterBy([...gol, ["Versão do veículo", "1.0 G5"]]);
    await expect(rows).toHaveCount(2);
  });
});
