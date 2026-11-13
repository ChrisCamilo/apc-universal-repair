import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { dataTable, dialog, thumbnailImage, toasts } from "./locators/common.ts";
import { userMenu } from "./locators/dashboard.ts";
import { deleteDialog, inventory, itemDetails, itemForm } from "./locators/inventory.ts";
import { savedItem, serveItems } from "./stubs/items.ts";
import { ITEMS } from "./data/items.ts";

// An item's details, on the desktop and on a phone, and duplicating and deleting an item.

// Opens an item's details from its row against an API that keeps what it is sent: the details show the item as
// text, Editar unlocks the fields in place and Salvar alterações patches the item. The pencil still opens the edit
// form and Enter on a focused row opens the details; the user menu has no choice to turn this off. A phone's details
// have a test of their own.
test("Web: a row opens the item details, editable after Editar", { tag: [TEST_TAGS.inventory, TEST_TAGS.desktopOnly] }, async ({ page }) => {
  const stock = [...ITEMS];
  await serveItems(page, stock);
  await page.route("**/api/items/*", async (route) => {
    const index = stock.findIndex((it) => route.request().url().endsWith(it.id));
    stock[index] = savedItem(route.request().postDataJSON(), stock[index]);
    return route.fulfill({ json: stock[index] });
  });
  await page.goto("/inventory");
  const { rows } = dataTable(page);
  const details = itemDetails(page);
  const edit = itemForm(page, "Editar item");

  await inventory(page).name("Amortecedor").click();
  await expect(details.field("Lado")).toContainText("Lado esquerdo");
  await expect(details.field("Local")).toContainText("A-10");
  await expect(details.root.getByRole("textbox")).toHaveCount(0);
  await details.edit.click();
  await expect(edit.name).toBeFocused();
  await edit.location.fill("A-11");
  await expect(edit.save).toHaveAccessibleName("Salvar alterações");
  await expect(edit.save).toBeInViewport();
  await edit.save.click();
  await expect(toasts(page).named("Item “Amortecedor” salvo.")).toBeVisible();
  await expect(edit.root).toBeHidden();
  expect(stock[3].brands[0].location).toBe("A-11");

  await inventory(page).edit("Filtro de óleo").click();
  await expect(edit.root).toBeVisible();
  await page.keyboard.press("Escape");
  await rows.first().focus();
  await page.keyboard.press("Enter");
  await expect(details.root).toBeVisible();
  await details.closeText.click();

  await userMenu(page).trigger.click();
  await expect(userMenu(page).checkbox(/Abrir item ao clicar na linha/)).toHaveCount(0);
});

// On a phone, opens an item's details from its card against an API that keeps what it is sent, the cards having no
// pencil or trash: the details fill the screen, as in the Detalhes mockup, with the ← in place of the × and Fechar and
// the red round "Excluir item" at the top right; the category over the name, the stock and the minimum, the vehicles,
// the position and side and the original codes, and a card for the brand with its code, price and place; Duplicar and
// Editar share the bottom. The ← closes them; Duplicar asks about the photos; Editar unlocks the fields, with no field
// started on, so the keyboard doesn't rise; and Excluir asks to confirm, then deletes the item and closes its details.
test("Web: on a phone an item's details fill the screen", { tag: [TEST_TAGS.inventory, TEST_TAGS.mobileOnly] }, async ({ page }) => {
  const stock = [...ITEMS];
  await serveItems(page, stock);
  await page.route("**/api/items/*", (route) => {
    stock.splice(stock.findIndex((it) => route.request().url().endsWith(it.id)), 1);
    return route.fulfill({ status: 204 });
  });
  await page.goto("/inventory");
  const { rows } = dataTable(page);
  const details = itemDetails(page);
  await expect(rows).toHaveCount(4);
  await expect(page.getByRole("button", { name: /^(Editar|Excluir) / })).toHaveCount(0);

  await inventory(page).name("Amortecedor").click();
  await expect(details.root).toBeVisible();
  const { width, height } = page.viewportSize()!;
  await expect.poll(async () => details.root.boundingBox()).toEqual({ x: 0, y: 0, width, height });
  await expect(details.back).toBeInViewport();
  await expect(details.remove).toBeInViewport();
  await expect(details.root.getByRole("button", { name: "Fechar" })).toHaveCount(0);
  await expect(details.root.getByRole("heading", { name: "Amortecedor" })).toBeVisible();
  await expect(details.root).toContainText("Suspensão");
  await expect(details.root).toContainText(/Em estoque\s*4\s*un\./);
  await expect(details.root).toContainText(/Mínimo\s*1\s*un\./);
  await expect(details.root).toContainText(/Veículos\s*Ford Escort/);
  await expect(details.root).toContainText(/Posição · Lado\s*Traseiro · Lado esquerdo/);
  await expect(details.root).toContainText(/Códigos originais\s*Nenhum/);
  await expect(details.root).toContainText("Marcas · 1");
  const brand = details.root.getByRole("group", { name: "Cofap" });
  await expect(brand).toContainText("AM-501");
  await expect(brand).toContainText(/R\$\s249,00/);
  await expect(brand).toContainText("Local A-10 · Preto");
  const halves = await Promise.all([details.duplicate, details.edit].map(async (button) => (await button.boundingBox())!));
  expect(Math.abs(halves[0].width - halves[1].width)).toBeLessThanOrEqual(1);
  expect(halves[0].y + halves[0].height).toBeLessThanOrEqual(height);
  await details.back.click();
  await expect(details.root).toBeHidden();

  await inventory(page).name("Amortecedor").click();
  await details.duplicate.click();
  const question = dialog(page, "Duplicar item?").root;
  await expect(question).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(question).toBeHidden();
  await details.edit.click();
  await expect(itemForm(page, "Editar item").name).toHaveValue("Amortecedor");
  await expect(itemForm(page, "Editar item").name).not.toBeFocused();
  await page.keyboard.press("Escape");
  await expect(itemForm(page, "Editar item").root).toBeHidden();

  await inventory(page).name("Amortecedor").click();
  await details.remove.click();
  await deleteDialog(page).confirm.click();
  await expect(toasts(page).named("Item “Amortecedor” excluído.")).toBeVisible();
  await expect(details.root).toBeHidden();
  await expect(rows).toHaveCount(3);
});

// Duplicates an item of two photos from its details against an API that keeps what it is sent: Copiar dados e fotos
// opens a new item's form filled in without the code and with the quantity at 0, and saving it with a code of its own
// posts the item, then sends the photos as copies of the first item's, which become photos of the copy's own. Deleting
// the first item leaves the copy's photos; duplicating the copy with Copiar só os dados gives an item without photos.
test("Web: an item is duplicated from its details, with or without its photos", { tag: [TEST_TAGS.inventory] }, async ({ page, isMobile }) => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  const photos = ["frente", "lado"].map((name) => ({ id: crypto.randomUUID(), url: `/photos/${name}.png`, thumbUrl: `/photos/${name}-thumb.webp` }));
  const stock = ITEMS.map((it, index) => (index === 0 ? { ...it, brands: [{ ...it.brands[0], photos }] } : it));
  const sent: string[][] = [];
  await page.route("**/api/photos/*", (route) => route.fulfill({ body: png, contentType: "image/png" }));
  await serveItems(page, stock);
  await page.route("**/api/items", (route) => {
    if (route.request().method() !== "POST") {
      return route.fallback();
    }
    stock.unshift(savedItem(route.request().postDataJSON()));
    return route.fulfill({ status: 201, json: stock[0] });
  });
  await page.route("**/api/items/*", (route) => {
    stock.splice(stock.findIndex((it) => route.request().url().endsWith(it.id)), 1);
    return route.fulfill({ status: 204 });
  });
  await page.route("**/api/items/*/brands/*/photos", (route) => {
    const index = stock.findIndex((it) => route.request().url().includes(`/items/${it.id}/brands/`));
    const body = route.request().postDataBuffer()!.toString("latin1");
    const copies = [...body.matchAll(/name="copy"\r\n\r\n([^\r]*)/g)].map(([, id]) => id);
    sent.push(copies.map((id) => `copy ${id}`));
    const copied = copies.map((_, position) => ({ id: crypto.randomUUID(), url: `/photos/copy-${position}.png`, thumbUrl: `/photos/copy-${position}-thumb.webp` }));
    stock[index] = { ...stock[index], brands: [{ ...stock[index].brands[0], photos: copied }] };
    return route.fulfill({ json: stock[index] });
  });
  await page.goto("/inventory");
  const { rows } = dataTable(page);
  const details = itemDetails(page);
  const question = dialog(page, "Duplicar item?");
  const form = itemForm(page, "Novo item");

  await rows.first().getByText("Filtro de óleo").click();
  await details.duplicate.click();
  const withPhotos = question.button("Copiar dados e fotos");
  await expect(withPhotos).toBeInViewport();
  await withPhotos.click();
  await expect(details.root).toBeHidden();
  await expect(form.name).toHaveValue("Filtro de óleo");
  await expect(form.code).toHaveValue("");
  await expect(form.quantity).toHaveValue("0");
  await expect(form.photos).toHaveCount(2);
  await form.code.fill("W 712/96");
  await form.save.click();
  await expect(toasts(page).named("Item “Filtro de óleo” cadastrado.")).toBeVisible();
  expect(sent).toEqual([photos.map((photo) => `copy ${photo.id}`)]);
  await expect(rows).toHaveCount(5);
  const copy = stock[0];
  expect([copy.brands[0].code, copy.quantity, copy.brands[0].photos.some((photo) => photos.some((each) => each.id === photo.id))]).toEqual(["W 712/96", 0, false]);

  // Both items are named "Filtro de óleo": the first item's trash is the second row's; on a phone, in its details.
  if (isMobile) {
    await rows.nth(1).getByText("Filtro de óleo").click();
    await itemDetails(page).remove.click();
  } else {
    await rows.nth(1).getByRole("button", { name: "Excluir Filtro de óleo" }).click();
  }
  await deleteDialog(page).confirm.click();
  await expect(rows).toHaveCount(4);
  await expect(thumbnailImage(inventory(page).photos("Filtro de óleo"))).toHaveAttribute("src", "/api/photos/copy-0-thumb.webp");

  await rows.first().getByText("Filtro de óleo").click();
  await details.duplicate.click();
  await question.button("Copiar só os dados").click();
  await expect(form.photos).toHaveCount(0);
  await form.code.fill("W 712/97");
  await form.save.click();
  await expect(rows).toHaveCount(5);
  expect([stock[0].brands[0].code, stock[0].brands[0].photos]).toEqual(["W 712/97", []]);
  expect(sent).toHaveLength(1);
});

// Deletes an item against an API that keeps what it is sent: the row's trash opens a confirmation naming the item
// and its code, Cancel and Escape leave the list as it was, and Excluir deletes it by its id, a toast confirms it
// and the list loses the row without a reload. Excluir is on screen without scrolling at both screen sizes.
test("Web: an item is deleted after confirming", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  const stock = [...ITEMS];
  const deleted: string[] = [];
  await serveItems(page, stock);
  await page.route("**/api/items/*", async (route) => {
    const index = stock.findIndex((it) => route.request().url().endsWith(it.id));
    deleted.push(`${route.request().method()} ${stock[index].id}`);
    stock.splice(index, 1);
    return route.fulfill({ status: 204 });
  });
  await page.goto("/inventory");
  const { rows } = dataTable(page);
  await expect(rows).toHaveCount(4);

  const trash = inventory(page).remove("Bomba d'água");
  const confirmation = deleteDialog(page);
  await trash.click();
  await expect(confirmation.root).toContainText("Bomba d'água (BA-77) sai do estoque. Essa ação não pode ser desfeita.");
  await expect(confirmation.confirm).toBeInViewport();
  await confirmation.cancel.click();
  await expect(confirmation.root).toBeHidden();
  await trash.click();
  await page.keyboard.press("Escape");
  await expect(confirmation.root).toBeHidden();
  await expect(rows).toHaveCount(4);
  expect(deleted).toEqual([]);

  const id = ITEMS[2].id;
  await trash.click();
  await confirmation.confirm.click();
  await expect(toasts(page).named("Item “Bomba d'água” excluído.")).toBeVisible();
  await expect(confirmation.root).toBeHidden();
  await expect(rows).toHaveCount(3);
  await expect(inventory(page).count).toHaveText("3 de 3 itens · 1 baixo · 0 esgotados");
  expect(deleted).toEqual([`DELETE ${id}`]);
});
