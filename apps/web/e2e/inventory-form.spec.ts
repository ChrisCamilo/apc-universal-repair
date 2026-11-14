import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { dataTable, options, toasts } from "./locators/common.ts";
import { fillItem, filtersMenu, inventory, itemDetails, itemForm } from "./locators/inventory.ts";
import { savedItem, serveItems } from "./stubs/items.ts";
import { ITEMS } from "./data/items.ts";

// The item form: adding and editing an item, a part code in use, the lists it creates, and the form on a phone.

// Adds an item through "Novo item" against an API that keeps what it is sent: saving the blank form names the
// required fields, the filled-in form is posted with the writing rule applied, a toast confirms it and the list
// shows the new item first without a reload; then the item's pencil opens it filled in and an edit is patched. Save is on
// screen without scrolling at both screen sizes.
test("Web: items are added and edited through the item form", { tag: [TEST_TAGS.inventory, TEST_TAGS.smoke] }, async ({ page }) => {
  const stock = [...ITEMS];
  await page.route("**/api/items", async (route) => {
    const saved = savedItem(route.request().postDataJSON());
    stock.unshift(saved);
    return route.fulfill({ status: 201, json: saved });
  });
  await serveItems(page, stock);
  await page.route("**/api/items/*", async (route) => {
    const index = stock.findIndex((it) => route.request().url().endsWith(it.id));
    stock[index] = savedItem(route.request().postDataJSON(), stock[index]);
    return route.fulfill({ json: stock[index] });
  });
  await page.goto("/inventory");
  const { rows } = dataTable(page);
  const form = itemForm(page, "Novo item");
  await inventory(page).newItem.click();
  await expect(form.save).toBeInViewport();
  await form.save.click();
  await expect(form.root.getByText("Informe o código da peça.")).toBeVisible();

  await fillItem(page, "Novo item", { code: "ngk-b7", name: "vela de ignição", category: "motor", partBrand: "Mann", vehicleBrand: "Chevrolet", unitPrice: "34,9" });
  await form.save.click();
  await expect(toasts(page).named("Item “Vela de ignição” cadastrado.")).toBeVisible();
  await expect(form.root).toBeHidden();
  await expect(rows).toHaveCount(5);
  await expect(rows.first()).toContainText("NGK-B7");

  await inventory(page).edit("Vela de ignição").click();
  const edit = itemForm(page, "Editar item");
  await expect(edit.unitPrice).toHaveValue("R$ 34,90");
  await edit.quantity.fill("9");
  await edit.save.click();
  await expect(toasts(page).named("Item “Vela de ignição” salvo.")).toBeVisible();
  await expect(rows.first()).toContainText("9");
});

// Types a code another item uses in Novo item, key by key, and checks the field names that item at once, before
// Save, and lets it go once the code is free; written with other separators, it is named again. In Editar item, the
// item's own code passes. Nothing is sent.
test("Web: a part code in use is named while it is typed", { tag: [TEST_TAGS.inventory] }, async ({ page }) => {
  await serveItems(page, [...ITEMS]);
  const sent: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") {
      sent.push(`${request.method()} ${request.url()}`);
    }
  });
  await page.goto("/inventory");
  await inventory(page).newItem.click();
  const form = itemForm(page, "Novo item");
  await form.code.pressSequentially("bp-1020");
  await expect(form.root.getByText("Código já usado em “Pastilha de freio”.")).toBeInViewport();
  await form.code.pressSequentially("1");
  await expect(form.root.getByText("Código já usado em “Pastilha de freio”.")).toBeHidden();
  await form.code.fill("bp1020");
  await expect(form.root.getByText("Código já usado em “Pastilha de freio”.")).toBeVisible();
  await form.close.click();

  await inventory(page).edit("Pastilha de freio").click();
  const edit = itemForm(page, "Editar item");
  await edit.code.fill("w 712/95");
  await expect(edit.root.getByText("Código já usado em “Filtro de óleo”.")).toBeVisible();
  await edit.code.fill("bp-1020");
  await expect(edit.root.getByText(/Código já usado/)).toBeHidden();
  expect(sent).toEqual([]);
});

// Creates a new item's names from the item form against an API that keeps what it is sent: a name the lists don't hold
// offers "+ Criar", written by the rule, and picking it creates the name, fills it in and says so in a toast. Only a
// name created this way is saved, so a list never gets a name no one meant to add.
test("Web: categories, brands and models are created from the item form", { tag: [TEST_TAGS.inventory] }, async ({ page, isMobile }) => {
  const stock = [...ITEMS];
  await page.route("**/api/items", async (route) => {
    const saved = savedItem(route.request().postDataJSON());
    stock.unshift(saved);
    return route.fulfill({ status: 201, json: saved });
  });
  await serveItems(page, stock);
  await page.goto("/inventory");
  const option = options(page).named;
  await inventory(page).newItem.click();
  const form = itemForm(page, "Novo item");
  await form.code.fill("t-1");
  await form.name.fill("Turbina");

  await test.step("a category and a part brand are created from their + Criar", async () => {
    await form.category.fill("motor diesel");
    await option("+ Criar categoria “Motor diesel”").click();
    await expect(toasts(page).named("Categoria “Motor diesel” criada.")).toBeVisible();
    await expect(form.category).toHaveValue("Motor diesel");
    await form.partBrand.fill("NGK");
    await option("+ Criar marca “NGK”").click();
    await expect(toasts(page).named("Marca de peça “NGK” criada.")).toBeVisible();
  });

  await test.step("a vehicle brand is created, then a model under it", async () => {
    // On a phone the vehicle is made in a new vehicle, a chip once Adicionar adds it.
    if (isMobile) {
      await form.addVehicle.click();
    }
    await form.vehicleBrand.fill("renault");
    await expect(form.vehicleModel).toBeDisabled();
    const brandCreated = page.waitForResponse((response) => response.url().endsWith("/api/vehicle-brands") && response.status() === 201);
    await option("+ Criar marca “Renault”").click();
    const renault = await (await brandCreated).json();
    await expect(toasts(page).named("Marca de veículo “Renault” criada.")).toBeVisible();
    await expect(form.vehicleModel).toBeEnabled();
    await form.vehicleModel.fill("Clio");
    const modelCreated = page.waitForRequest((request) => request.url().endsWith("/api/vehicle-models") && request.method() === "POST");
    await option("+ Criar modelo “Clio”").click();
    expect((await modelCreated).postDataJSON()).toEqual({ name: "Clio", vehicleBrandId: renault.id });
    await expect(toasts(page).named("Modelo “Clio” criado.")).toBeVisible();
    if (isMobile) {
      await form.confirmVehicle.click();
      await expect(form.vehicle("Renault Clio")).toBeVisible();
    }
  });

  await test.step("a name typed without + Criar is refused on save, and the item is saved with the names created", async () => {
    await form.unitPrice.fill("10");

    await form.category.fill("Turbo");
    await form.save.click();
    await expect(form.root.getByText("Categoria não cadastrada. Escolha “+ Criar categoria” na lista.")).toBeVisible();
    await form.category.fill("motor diesel");
    await form.save.click();
    await expect(toasts(page).named("Item “Turbina” cadastrado.")).toBeVisible();
    expect(stock[0]).toMatchObject({
      category: "Motor diesel",
      vehicles: [{ vehicleBrand: "Renault", vehicleModel: "Clio" }],
      brands: [{ partBrand: "NGK" }],
    });
  });

  await test.step("the new category is in the Filtros menu without a reload", async () => {
    await inventory(page).filters.click();
    await filtersMenu(page).field("Categoria").click();
    await expect(option("Motor diesel")).toBeVisible();
  });
});

// At 360×780, creates an item of two brands through "Novo item" and edits it, against an API that keeps what it is
// sent: the form fills the screen as in the Novo item mockup, its focus on the × so no keyboard rises, and each choice
// is made by touch, in full words, as a phone's form asks.
test("Web: on a phone the item form fills the screen, as in the Novo item mockup", { tag: [TEST_TAGS.inventory, TEST_TAGS.mobileOnly] }, async ({ page }) => {
  const stock = [...ITEMS];
  await page.route("**/api/items", async (route) => {
    const saved = savedItem(route.request().postDataJSON());
    stock.unshift(saved);
    return route.fulfill({ status: 201, json: saved });
  });
  await serveItems(page, stock);
  await page.route("**/api/items/*", async (route) => {
    const index = stock.findIndex((it) => route.request().url().endsWith(it.id));
    stock[index] = savedItem(route.request().postDataJSON(), stock[index]);
    return route.fulfill({ json: stock[index] });
  });
  await page.goto("/inventory");
  const form = itemForm(page, "Novo item");
  await test.step("the form fills the screen, its × focused, with Salvar item across the bottom and no Cancelar", async () => {
    await inventory(page).newItem.click();
    const { width, height } = page.viewportSize()!;
    await expect.poll(async () => form.root.boundingBox()).toEqual({ x: 0, y: 0, width, height });
    await expect(form.close).toBeFocused();
    await expect(form.root.getByRole("button", { name: "Cancelar" })).toHaveCount(0);
    await expect(form.save).toHaveAccessibleName("Salvar item");
    await expect(form.save).toBeInViewport();
    const save = (await form.save.boundingBox())!;
    expect(save.width).toBe(width - 32);
  });

  await test.step("the vehicle is added as a chip, the position and side chosen in full words, the minimum raised with its +", async () => {
    await form.name.fill("pastilha de freio");
    await form.category.fill("Freios");
    await form.category.press("Escape");
    await form.addVehicle.click();
    await expect(form.vehicleBrand).toBeFocused();
    await form.vehicleBrand.fill("Volkswagen");
    await form.vehicleBrand.press("Escape");
    await form.vehicleModel.fill("Gol");
    await form.vehicleModel.press("Escape");
    await form.confirmVehicle.click();
    await expect(form.vehicle("Volkswagen Gol")).toBeVisible();
    await expect(form.addVehicle).toBeFocused();
    await form.position("Dianteira").click();
    await form.side("Esquerdo").click();
    await form.raiseMinimum.click();
    await expect(form.minimum).toHaveValue("1");
  });

  await test.step("two brands are filled in, the second from the dashed Adicionar marca, and the item is posted with both", async () => {
    const first = form.brand(1);
    await expect(first.getByLabel("Tirar foto")).toBeAttached();
    await expect(first.getByLabel("Galeria")).toBeAttached();
    await first.getByRole("combobox", { name: "Marca da peça" }).fill("Cobreq");
    await first.getByRole("combobox", { name: "Marca da peça" }).press("Escape");
    await first.getByLabel("Código da peça").fill("n-1210");
    await first.getByLabel("Quantidade", { exact: true }).fill("4");
    await first.getByLabel("Valor unitário (R$)").fill("79,9");
    const [quantity, price] = await Promise.all(
      [first.getByLabel("Quantidade", { exact: true }), first.getByLabel("Valor unitário (R$)")].map(async (field) => (await field.boundingBox())!),
    );
    expect(quantity.y).toBe(price.y);
    await form.addBrand.click();
    const second = form.brand(2);
    await second.getByRole("combobox", { name: "Marca da peça" }).fill("Mann");
    await second.getByRole("combobox", { name: "Marca da peça" }).press("Escape");
    await second.getByLabel("Código da peça").fill("w-2");
    await second.getByLabel("Valor unitário (R$)").fill("10");
    await form.save.click();
    await expect(toasts(page).named("Item “Pastilha de freio” cadastrado.")).toBeVisible();
    await expect(form.root).toBeHidden();
    expect(stock[0]).toMatchObject({
      name: "Pastilha de freio",
      vehicles: [{ vehicleBrand: "Volkswagen", vehicleModel: "Gol" }],
      position: "D",
      side: "LE",
      minQuantity: 1,
      brands: [
        { partBrand: "Cobreq", code: "N-1210", quantity: 4, unitPriceCents: 7990 },
        { partBrand: "Mann", code: "W-2", unitPriceCents: 1000 },
      ],
    });
  });

  await test.step("the edit, from the card's details, is titled with the item's name, keeps its choices and patches a new side", async () => {
    await dataTable(page).rows.filter({ hasText: "N-1210" }).first().click();
    await itemDetails(page).edit.click();
    const edit = itemForm(page, "Editar item");
    await expect(edit.root.getByRole("heading", { name: "Pastilha de freio" })).toBeVisible();
    await expect(edit.vehicle("Volkswagen Gol")).toBeVisible();
    await expect(edit.position("Dianteira")).toBeChecked();
    await edit.side("Ambos").click();
    await edit.save.click();
    await expect(toasts(page).named("Item “Pastilha de freio” salvo.")).toBeVisible();
    expect(stock[0]).toMatchObject({ side: "Ambos", brands: [{ code: "N-1210" }, { code: "W-2" }] });
  });
});
