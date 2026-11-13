import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { dialog, thumbnailImage, toasts } from "./locators/common.ts";
import { inventory, itemForm } from "./locators/inventory.ts";
import { savedItem, serveItems } from "./stubs/items.ts";
import { ITEMS } from "./data/items.ts";

// An item's photos, added and removed from the list and the form.

// Works with an item's photos against an API that keeps what it is sent: the row shows the cover's thumbnail, which
// opens the photos large; "Adicionar foto" sends the kept photo and the new file, in order, and the viewer and the
// list follow; removing the cover sends what is left. Then a photo added in the edit form is sent after the item.
test("Web: item photos are added and removed from the list and the form", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  const cover = { id: crypto.randomUUID(), url: "/photos/cover.png", thumbUrl: "/photos/cover-thumb.webp" };
  const stock = ITEMS.map((it, index) => (index === 0 ? { ...it, brands: [{ ...it.brands[0], photos: [cover] }] } : it));
  const sent: string[][] = [];
  await page.route("**/api/photos/*", (route) => route.fulfill({ body: png, contentType: "image/png" }));
  await serveItems(page, stock);
  await page.route("**/api/items/*", (route) => {
    const index = stock.findIndex((it) => route.request().url().endsWith(it.id));
    stock[index] = savedItem(route.request().postDataJSON(), stock[index]);
    return route.fulfill({ json: stock[index] });
  });
  await page.route("**/api/items/*/brands/*/photos", (route) => {
    const index = stock.findIndex((it) => route.request().url().includes(`/items/${it.id}/brands/`));
    const body = route.request().postDataBuffer()!.toString("latin1");
    const parts = [...body.matchAll(/name="(keep|photo)"(?:; filename="([^"]+)")?[^\r]*\r\n(?:Content-Type[^\r]*\r\n)?\r\n([^\r]*)/g)];
    sent.push(parts.map(([, name, file, value]) => (name === "keep" ? `keep ${value}` : `photo ${file}`)));
    const photos = parts.map(([, name, , value], position) =>
      name === "keep"
        ? stock[index].brands[0].photos.find((photo) => photo.id === value)!
        : { id: crypto.randomUUID(), url: `/photos/new-${position}.png`, thumbUrl: `/photos/new-${position}-thumb.webp` },
    );
    stock[index] = { ...stock[index], brands: [{ ...stock[index].brands[0], photos }, ...stock[index].brands.slice(1)] };
    return route.fulfill({ json: stock[index] });
  });
  await page.goto("/inventory");
  const inv = inventory(page);

  const thumbnail = inv.photos("Filtro de óleo");
  await expect(thumbnailImage(thumbnail)).toHaveAttribute("src", "/api/photos/cover-thumb.webp");
  await thumbnail.click();
  const viewer = dialog(page, "Filtro de óleo");
  await expect(viewer.root.getByRole("img")).toHaveAttribute("src", "/api/photos/cover.png");
  await viewer.root.getByTestId("common.image-viewer.body.input").setInputFiles({ name: "lado.png", mimeType: "image/png", buffer: png });
  await expect(viewer.root.getByText("Foto adicionada")).toBeVisible();
  expect(sent).toEqual([[`keep ${cover.id}`, "photo lado.png"]]);
  await expect(viewer.root.getByRole("button", { name: /^Foto \d$/ })).toHaveCount(2);

  await viewer.root.getByRole("button", { name: "Foto 1" }).click();
  await viewer.root.getByRole("button", { name: "Remover esta foto" }).click();
  await dialog(page, "Remover esta foto?").button("Remover").click();
  await expect(viewer.root.getByText("Foto removida")).toBeVisible();
  expect(sent[1]).toEqual([`keep ${stock[0].brands[0].photos[0].id}`]);
  await viewer.close.click();
  await expect(thumbnailImage(thumbnail)).toHaveAttribute("src", "/api/photos/new-1-thumb.webp");

  await inv.edit("Pastilha de freio").click();
  const edit = itemForm(page, "Editar item");
  await edit.photoFile.setInputFiles({ name: "frente.png", mimeType: "image/png", buffer: png });
  await edit.save.click();
  await expect(toasts(page).named("Item “Pastilha de freio” salvo.")).toBeVisible();
  expect(sent[2]).toEqual(["photo frente.png"]);
  await expect(thumbnailImage(inv.photos("Pastilha de freio"))).toHaveAttribute("src", "/api/photos/new-0-thumb.webp");
});
