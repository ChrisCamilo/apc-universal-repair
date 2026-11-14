import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import type { Item } from "@apc/domain/items";
import { dialog, thumbnailImage, toasts } from "./locators/common.ts";
import { fillItem, inventory, itemDetails, itemForm } from "./locators/inventory.ts";
import { savedItem, serveItems } from "./stubs/items.ts";
import { item } from "./data/items.ts";

// A photo the API serves, a pixel of PNG.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
// The API answers GET /items with these items, newest first: a brake disc with a photo, its material and a short
// description, and an oil filter with neither.
const ITEMS: Item[] = [
  item({
    code: "BD-3377",
    name: "Disco de freio",
    category: "Freios",
    partBrand: "Fremax",
    vehicleBrand: "Chevrolet",
    vehicleModel: "Monza",
    material: "Ferro fundido",
    description: "Ventilado, 256 mm",
    photos: [{ id: crypto.randomUUID(), url: "/photos/disc.png", thumbUrl: "/photos/disc-thumb.webp" }],
  }),
  item({ code: "W 712/95", name: "Filtro de óleo", category: "Motor", partBrand: "Mann", vehicleBrand: "Volkswagen", vehicleModel: "Gol" }),
];

// Opens the brake disc's photo and checks its short description shows under it, then its details, which list the
// description and the material, neither in its row; then adds an item with both and checks its details show them.
test("Web: an item's material and short description show in its details and under its photo", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const stock = [...ITEMS];
  await page.route("**/api/photos/*", (route) => route.fulfill({ body: PNG, contentType: "image/png" }));
  await page.route("**/api/items", async (route) => {
    const saved = savedItem(route.request().postDataJSON());
    stock.unshift(saved);
    return route.fulfill({ status: 201, json: saved });
  });
  await serveItems(page, stock);
  await page.goto("/inventory");
  const inv = inventory(page);

  const thumbnail = inv.photos("Disco de freio");
  await expect(thumbnailImage(thumbnail)).toBeVisible();
  await thumbnail.click();
  const viewer = dialog(page, "Disco de freio");
  await expect(viewer.root.getByText("Ventilado, 256 mm")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer.root).toBeHidden();
  await expect(page.getByText("Ventilado, 256 mm")).toHaveCount(0);

  await inv.name("Disco de freio").click();
  const details = itemDetails(page);
  await expect(details.root.getByText("Ventilado, 256 mm")).toBeVisible();
  await expect(details.root.getByText("Ferro fundido", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(details.root).toBeHidden();

  await inv.newItem.click();
  const form = itemForm(page, "Novo item");
  await fillItem(page, "Novo item", { code: "ngk-b7", name: "vela", category: "Motor", partBrand: "Mann", vehicleBrand: "Volkswagen", unitPrice: "34,9" });
  await form.material.fill("níquel");
  await form.description.fill("eletrodo de níquel, rosca longa 19 mm");
  await expect(form.description).toHaveValue("eletrodo de níquel, rosca long");
  await form.save.click();
  await expect(toasts(page).named("Item “Vela” cadastrado.")).toBeVisible();
  await inv.name("Vela").click();
  await expect(details.root.getByText("Eletrodo de níquel, rosca long")).toBeVisible();
  await expect(details.root.getByText("Níquel", { exact: true })).toBeVisible();
});
