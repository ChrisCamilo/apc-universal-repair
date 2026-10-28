import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { expect, test } from "./support/fixtures.ts";
import { dataTable } from "./locators/common.ts";
import { inventory } from "./locators/inventory.ts";
import { CSV_COLUMNS, CSV_PHOTOS_COLUMN } from "@apc/shared/item-csv";
import type { Item } from "@apc/shared/items";
import { item } from "./data/items.ts";

// 30 parts the search finds, over two pages of 25, the first with a photo, and 5 filters it leaves out.
const STOCK: Item[] = [
  ...Array.from({ length: 30 }, (_, index) =>
    item({
      code: `P-${index + 1}`,
      name: `Peça ${index + 1}`,
      photos: index === 0 ? [{ id: crypto.randomUUID(), url: "/photos/p1.jpg", thumbUrl: "/photos/p1-thumb.webp" }] : [],
    }),
  ),
  ...Array.from({ length: 5 }, (_, index) => item({ code: `F-${index + 1}`, name: `Filtro ${index + 1}` })),
];
// A 1×1 PNG, what the API answers for the first part's photo.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

/**
 * Exports the list from the dialog, with or without the photo paths, and reads the file downloaded.
 * @param page The test's page.
 * @param photos Whether to turn the photo paths on.
 * @returns The file's name and its lines.
 */
async function exportList(page: Page, photos: boolean): Promise<{ name: string; lines: string[] }> {
  await inventory(page).exportCsv.click();
  const dialog = page.getByRole("dialog", { name: "Exportar CSV" });
  await expect(dialog).toContainText("30 itens, com a busca e os filtros atuais.");
  if (photos) {
    await dialog.getByRole("switch", { name: "Incluir o caminho das fotos" }).click();
  }
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Exportar" }).click();
  const file = await download;
  // The last one: the same message from the export before may still be fading out under it.
  await expect(page.getByText("30 itens exportados.").last()).toBeVisible();
  await expect(dialog).toBeHidden();
  const text = (await readFile(await file.path(), "utf8")).replace(/^﻿/, "");
  return { name: file.suggestedFilename(), lines: text.split("\r\n") };
}

test.use({ stock: { items: STOCK } });

// Searches for the parts, goes to page 2 and exports, and checks the file holds every part the search finds, from
// both pages, and none it leaves out, with the photos column only when the switch is on.
test("Web: the CSV export takes every page of the list as it is", async ({ page }) => {
  await page.route("**/api/photos/*", (route) => route.fulfill({ body: PNG, contentType: "image/png" }));
  await page.goto("/inventory");
  const inv = inventory(page);
  await inv.search.fill("Peça");
  await inv.pager.page(2).click();
  await expect(dataTable(page).rows).toHaveCount(5);

  const plain = await exportList(page, false);
  expect(plain.name).toMatch(/^estoque-\d{4}-\d{2}-\d{2}\.csv$/);
  expect(plain.lines[0]).toBe(CSV_COLUMNS.join(","));
  const codes = plain.lines.slice(1, -1).map((line) => line.split(",")[1]);
  expect(codes.sort()).toEqual(Array.from({ length: 30 }, (_, index) => `P-${index + 1}`).sort());
  expect(plain.lines.at(-1)).toBe("");

  const withPhotos = await exportList(page, true);
  expect(withPhotos.lines[0]).toBe(`${CSV_COLUMNS.join(",")},${CSV_PHOTOS_COLUMN}`);
  expect(withPhotos.lines.find((line) => line.split(",")[1] === "P-1")).toMatch(/,\/photos\/p1\.jpg$/);
});
