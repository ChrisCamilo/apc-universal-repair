import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { dataTable, modals, tour } from "./locators/common.ts";
import { dashboard, userMenu } from "./locators/dashboard.ts";
import { deleteDialog, filtersMenu, inventory, itemDetails, itemForm } from "./locators/inventory.ts";
import { savedItem, serveItems } from "./stubs/items.ts";
import { signIn } from "./stubs/session.ts";
import { ITEMS } from "./data/items.ts";

// The Inventory's guided tutorial.

// Runs the Inventory tutorial from its first start to its replay against an API that keeps what it is sent: each step
// points at its target, moves on when the user does it, and "Fazer por mim" does it for them. At 360×780 each card
// stays clear of its spotlight and, over the tab, of the bottom bar.
test("Web: the Inventory tutorial creates, finds, edits and deletes a test item", { tag: [TEST_TAGS.inventory] }, async ({ page, isMobile }) => {
  await signIn(page, false);
  const stock = [...ITEMS];
  await page.route("**/api/items", async (route) => {
    const saved = savedItem(route.request().postDataJSON());
    stock.unshift(saved);
    return route.fulfill({ status: 201, json: saved });
  });
  await serveItems(page, stock);
  await page.route("**/api/items/*", async (route) => {
    const index = stock.findIndex((held) => route.request().url().endsWith(held.id));
    if (route.request().method() === "DELETE") {
      stock.splice(index, 1);
      return route.fulfill({ status: 204 });
    }
    stock[index] = savedItem(route.request().postDataJSON(), stock[index]);
    return route.fulfill({ json: stock[index] });
  });
  await page.goto("/inventory");
  const inv = inventory(page);
  const guide = tour(page);
  /** Tells whether the card is clear of the spotlight and, while no dialog covers the tab, of the bottom bar. */
  const clear = async () => {
    const card = (await guide.card.boundingBox())!;
    const spot = (await guide.spotlight.count()) > 0 ? await guide.spotlight.boundingBox() : null;
    const bar = (await modals(page).count()) === 0 ? await dashboard(page).bar.boundingBox() : null;
    const apart = (other: { y: number; height: number }) => card.y + card.height <= other.y || other.y + other.height <= card.y;
    return (!spot || apart(spot)) && (!bar || card.y + card.height <= bar.y);
  };
  /** Waits for the tutorial's step by its title, its card clear of what it shouldn't cover on a phone. */
  const atStep = async (title: string) => {
    await expect(guide.step(title)).toBeVisible();
    if (isMobile) {
      await expect.poll(clear).toBe(true);
    }
  };
  const doIt = () => guide.doIt.click();
  const { rows } = dataTable(page);
  const testRow = rows.filter({ hasText: "TUTORIAL-001" });

  await test.step("part 1 creates the test item, and closing the form goes back to the step that opens it", async () => {
    await atStep("Abra o cadastro");
    await expect(guide.card).toContainText("Parte 1 de 3 · Cadastrar um item");
    await expect(guide.spotlight).toBeVisible();
    await inv.newItem.first().click();
    await atStep("Diga que peça é");
    if (isMobile) {
      await itemForm(page, "Novo item").close.click();
    } else {
      await itemForm(page, "Novo item").cancel.click();
    }
    await atStep("Abra o cadastro");
    await doIt();
    await atStep("Diga que peça é");
    await doIt();
    await atStep("Diga onde e quantas");
    await expect(itemForm(page, "Novo item").code).toHaveValue("TUTORIAL-001");
    await doIt();
    await atStep("Salve o item");
    await doIt();
  });

  await test.step("part 2 finds the test item with the search and the filters", async () => {
    await atStep("Procure pelo nome");
    await expect(testRow).toHaveCount(1);
    await inv.search.fill("tutorial");
    await atStep("Abra os filtros");
    await inv.filters.click();
    await atStep("Filtre o estoque");
    if (isMobile) {
      // The card goes above "Ver itens", over the sheet's top, but clear of the fields the step asks for.
      const card = (await guide.card.boundingBox())!;
      expect(card.y + card.height).toBeLessThanOrEqual((await filtersMenu(page).field("Marca da peça").boundingBox())!.y);
    }
    await doIt();
    await atStep("Achou");
    await expect(rows).toHaveCount(1);
    await guide.next.click();
  });

  await test.step("part 3 edits the test item to a low and then an out-of-stock row, and deletes it", async () => {
    await atStep("Abra o item");
    await testRow.click();
    await atStep("Libere a edição");
    await itemDetails(page).edit.click();
    await atStep("Mude o nome e a quantidade");
    await doIt();
    await atStep("Salve as alterações");
    await doIt();
    await atStep("Estoque baixo");
    await expect(testRow).toHaveAttribute("data-status", "warn");
    await guide.next.click();
    // A phone's cards have no pencil or trash: the second edit and the delete go through the item's details.
    if (isMobile) {
      await atStep("Edite de novo");
      await testRow.click();
      await atStep("Edite de novo");
      await itemDetails(page).edit.click();
    } else {
      await atStep("Edite pelo lápis");
      await inv.edit("Item de teste do tutorial editado").click();
    }
    await atStep("Zere a quantidade");
    await doIt();
    await atStep("Esgotado");
    await expect(testRow).toHaveAttribute("data-status", "danger");
    await guide.next.click();
    await atStep("Exclua o item");
    if (isMobile) {
      await testRow.click();
      await atStep("Exclua o item");
      await itemDetails(page).remove.click();
    } else {
      await inv.remove("Item de teste do tutorial editado").click();
    }
    await atStep("Confirme");
    await deleteDialog(page).confirm.click();
    await atStep("Pronto!");
    await guide.done.click();
  });

  await test.step("at the end the search and the filters are off and the test item is gone", async () => {
    await expect(guide.card).toBeHidden();
    await expect(rows).toHaveCount(4);
    await expect(inv.search).toHaveValue("");
    await expect(inv.filters).toBeVisible();
    await expect(inv.filters).toHaveAccessibleName("Filtros");
    expect(stock.some((held) => held.brands.some((brand) => brand.code === "TUTORIAL-001"))).toBe(false);
  });

  await test.step("the user menu replays the tutorial, and Skip ends it", async () => {
    await userMenu(page).trigger.click();
    await userMenu(page).item("Tutorial do estoque").click();
    await atStep("Abra o cadastro");
    await guide.skip.click();
    await expect(guide.card).toBeHidden();
  });
});
