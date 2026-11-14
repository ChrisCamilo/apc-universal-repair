import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { dataTable, toasts } from "./locators/common.ts";
import { importDialog, inventory } from "./locators/inventory.ts";
import type { ItemCreate } from "@apc/domain/items";
import { savedItem, serveItems } from "./stubs/items.ts";
import { ITEMS } from "./data/items.ts";

// Importing items from a CSV file.

// Imports a spreadsheet through "Importar CSV" against an API that keeps what it is sent. The file is checked before
// anything is sent, so a row with an error is left out and a part code in use updates its item rather than adding a
// second one.
test("Web: items are imported from a CSV file", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const stock = [...ITEMS];
  const imported: string[] = [];
  await page.route("**/api/items/import", async (route) => {
    const result = { created: 0, updated: 0 };
    for (const sent of route.request().postDataJSON().items as ItemCreate[]) {
      const codes = sent.brands.map((brand) => brand.code);
      imported.push(...codes);
      const index = stock.findIndex((held) => held.brands.some((brand) => codes.includes(brand.code)));
      if (index >= 0) {
        stock[index] = savedItem({ ...sent, brands: sent.brands.map((brand) => ({ ...brand, id: stock[index].brands[0].id })) }, stock[index]);
        result.updated++;
      } else {
        stock.unshift(savedItem(sent));
        result.created++;
      }
    }
    return route.fulfill({ json: result });
  });
  await serveItems(page, stock);
  await page.goto("/inventory");
  const { rows } = dataTable(page);
  await expect(rows).toHaveCount(4);

  const importer = importDialog(page);
  await test.step("Importar CSV downloads the template", async () => {
    await inventory(page).importCsv.click();
    const download = page.waitForEvent("download");
    await importer.template.click();
    expect((await download).suggestedFilename()).toBe("modelo-estoque.csv");
  });

  await test.step("the file chosen is previewed with the names to create and the row with an error marked", async () => {
    const file = [
      "code;name;category;part_brand;vehicle_brand;vehicle_model;quantity;minimum;location;unit_price;color;position;side",
      "w 712/95;filtro de óleo;motor;Mann;volkswagen;gol;20;2;A-2;42,50;;;",
      "ngk-b7;vela de ignição;Ignição;NGK;Fiat;Uno;10;3;B-1;34.9;;;",
      ";sem código;Freios;Cobreq;Ford;;1;;;0;;;",
    ].join("\n");
    await importer.file.setInputFiles({ name: "estoque.csv", mimeType: "text/csv", buffer: Buffer.from(file) });
    await expect(importer.root.getByText("estoque.csv · 2 itens prontos para importar · 1 linha com erro")).toBeVisible();
    await expect(importer.root.getByText("Categorias: Ignição")).toBeVisible();
    await expect(importer.root.getByText("Marcas de peça: NGK")).toBeVisible();
    await expect(importer.rows.filter({ hasText: "Informe o código da peça." })).toHaveAttribute("data-invalid", "true");
    const submit = importer.submit(2);
    await expect(submit).toBeInViewport();
    await submit.click();
  });

  await test.step("importing saves the valid rows, a new item and an update of the one whose code is in use", async () => {
    await expect(toasts(page).named("Importação concluída: 1 item criado, 1 atualizado.")).toBeVisible();
    await expect(importer.root).toBeHidden();
    expect(imported).toEqual(["W 712/95", "NGK-B7"]);
    await expect(rows).toHaveCount(5);
    await expect(rows.first()).toContainText("Vela de ignição");
    await expect(rows.filter({ hasText: "Filtro de óleo" })).toContainText("20");
  });
});
