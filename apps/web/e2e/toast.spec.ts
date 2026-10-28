import type { Page } from "@playwright/test";
import { expect, test } from "./support/fixtures.ts";
import { TEST_TAGS } from "@apc/shared/test-tags";
import { rgb } from "./support/expect.ts";
import { toasts } from "./locators/common.ts";
import { fillItem, inventory, itemForm } from "./locators/inventory.ts";
import type { Item } from "@apc/shared/items";
import { THEME_STORAGE_KEYS, themes, type Mode, type Style } from "@apc/shared/theme";
import { TOAST_KIND_LOOKS, type ToastKind } from "@apc/shared/toast";
import { savedItem, serveItems } from "./stubs/items.ts";
import { item } from "./data/items.ts";

// A 1×1 PNG, what the API answers for a photo.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
// One night and one day theme, so each kind is checked in both modes.
const THEMES: [Style, Mode][] = [
  ["eighties", "night"],
  ["gt4", "day"],
];
const FILTER: Item = item({
  id: "00000000-0000-4000-8000-000000000001",
  code: "W 712/95",
  name: "Filtro de óleo",
  partBrand: "Mann",
  location: "A-2",
  quantity: 8,
  minQuantity: 2,
  unitPriceCents: 3990,
});

/**
 * Checks the toast showing has a kind's look in a theme: its pill in the kind's status color with its text color, the
 * kind's icon, and the live region of the kind (an alert for errors and warnings, the status region otherwise).
 * @param page The test's page.
 * @param kind The kind the toast should be.
 * @param message The message it shows.
 * @param theme The style and mode the page is in.
 */
async function expectToast(page: Page, kind: ToastKind, message: string, [style, mode]: [Style, Mode]) {
  const look = TOAST_KIND_LOOKS[kind];
  const { urgent, polite, messages } = toasts(page);
  const pill = (look.urgent ? urgent : polite).locator(messages).filter({ hasText: message });
  await expect(pill).toBeVisible();
  await expect(pill).toHaveAttribute("data-kind", kind);
  const { colors } = themes[style][mode];
  await expect(pill).toHaveCSS("background-color", rgb(colors[look.color]));
  await expect(pill).toHaveCSS("color", rgb(colors[look.onColor]));
  const drawn = await pill.locator("svg > *").evaluateAll((shapes) => shapes.map((shape) => shape.getAttribute("d") ?? Number(shape.getAttribute("r"))));
  expect(drawn).toEqual(look.icon.map((shape) => (shape.kind === "path" ? shape.d : shape.kind === "circle" ? shape.r : null)));
}

/**
 * Opens the new item form and fills in a valid item.
 * @param page The test's page.
 * @returns The form.
 */
async function fillNewItem(page: Page) {
  await inventory(page).newItem.click();
  await fillItem(page, "Novo item", { code: "NGK-B7", name: "Vela de ignição", category: "Motor", partBrand: "Mann", vehicleBrand: "Volkswagen", unitPrice: "34,9" });
  return itemForm(page, "Novo item");
}

/**
 * Starts the page in a style and mode, as if the user had picked them.
 * @param page The test's page.
 * @param theme The style and mode.
 */
async function startIn(page: Page, [style, mode]: [Style, Mode]) {
  await page.addInitScript(
    ([keys, picked]) => {
      localStorage.setItem(keys.style, picked[0]);
      localStorage.setItem(keys.mode, picked[1]);
    },
    [THEME_STORAGE_KEYS, [style, mode]] as const,
  );
}

for (const theme of THEMES) {
  // Adds an item through the form against an API that saves it, and checks the success toast in green with the check.
  test(`Web: a saved item shows a success toast in ${theme.join("/")}`, { tag: [TEST_TAGS.notifications, TEST_TAGS.theme] }, async ({ page }) => {
    await startIn(page, theme);
    const stock = [FILTER];
    await page.route("**/api/items", (route) => {
      const saved = { ...savedItem(route.request().postDataJSON()), id: "00000000-0000-4000-8000-000000000002" };
      stock.unshift(saved);
      return route.fulfill({ status: 201, json: saved });
    });
    await serveItems(page, stock);
    await page.goto("/inventory");
    await (await fillNewItem(page)).save.click();
    await expectToast(page, "success", "Item “Vela de ignição” cadastrado.", theme);
  });

  // Saves an item while the API fails, and checks the error toast in red with the X, read out at once, and the form
  // stays open.
  test(`Web: a failed save shows an error toast in ${theme.join("/")}`, { tag: [TEST_TAGS.notifications, TEST_TAGS.theme] }, async ({ page }) => {
    await startIn(page, theme);
    await page.route("**/api/items", (route) => route.fulfill({ status: 500, body: "" }));
    await serveItems(page, [FILTER]);
    await page.goto("/inventory");
    const form = await fillNewItem(page);
    await form.save.click();
    await expectToast(page, "error", "Não foi possível salvar o item. Tente de novo.", theme);
    await expect(form.root).toBeVisible();
  });

  // Removes an item's photo in the edit form while the API can't save photos, and checks the warning toast in yellow
  // with the "!", read out at once: the item is saved, its photos aren't.
  test(`Web: photos that fail to save show a warning toast in ${theme.join("/")}`, { tag: [TEST_TAGS.notifications, TEST_TAGS.theme] }, async ({ page }) => {
    await startIn(page, theme);
    const withPhoto = {
      ...FILTER,
      brands: [{ ...FILTER.brands[0], photos: [{ id: "00000000-0000-4000-8000-0000000000aa", url: "/photos/aa.png", thumbUrl: "/photos/aa-thumb.png" }] }],
    };
    await page.route("**/api/photos/*", (route) => route.fulfill({ body: PNG, contentType: "image/png" }));
    await serveItems(page, [withPhoto]);
    await page.route("**/api/items/*", (route) => route.fulfill({ json: withPhoto }));
    await page.route("**/api/items/*/brands/*/photos", (route) => route.fulfill({ status: 500, body: "" }));
    await page.goto("/inventory");
    await inventory(page).edit("Filtro de óleo").click();
    const form = itemForm(page, "Editar item");
    await form.removePhoto(1).click();
    await form.save.click();
    await expectToast(page, "warning", "Item “Filtro de óleo” salvo, mas as fotos não foram salvas. Tente de novo.", theme);
  });

  // Saves an item's edit form without changing anything, and checks nothing is sent and the info toast in blue with the
  // "i" says there is nothing to save.
  test(`Web: an unchanged edit shows an info toast in ${theme.join("/")}`, { tag: [TEST_TAGS.notifications, TEST_TAGS.theme] }, async ({ page }) => {
    await startIn(page, theme);
    const patched: string[] = [];
    await serveItems(page, [FILTER]);
    await page.route("**/api/items/*", (route) => {
      patched.push(route.request().url());
      return route.fulfill({ json: FILTER });
    });
    await page.goto("/inventory");
    await inventory(page).edit("Filtro de óleo").click();
    const form = itemForm(page, "Editar item");
    await form.save.click();
    await expectToast(page, "info", "Nenhuma alteração para salvar.", theme);
    await expect(form.root).toBeHidden();
    expect(patched).toEqual([]);
  });
}

/**
 * Samples a toast's opacity every frame, from now until it is fully shown or, when leaving, until it leaves the page.
 * @param page The test's page.
 * @param until "shown" to stop at full opacity, "gone" to stop once the toast left the page.
 * @returns The opacities seen, in order.
 */
function sampleOpacity(page: Page, until: "shown" | "gone"): Promise<number[]> {
  return page.evaluate(
    (stop) =>
      new Promise<number[]>((resolve) => {
        const seen: number[] = [];
        const tick = () => {
          const pill = document.querySelector('[data-testid="common.toast.message"]');
          if (pill) {
            seen.push(Number(getComputedStyle(pill).opacity));
          }
          const done = stop === "shown" ? seen.at(-1) === 1 : seen.length > 0 && !pill;
          if (done || seen.length > 1000) {
            resolve(seen);
          } else {
            requestAnimationFrame(tick);
          }
        };
        tick();
      }),
    until,
  );
}

/**
 * Opens an item's edit form, where saving unchanged shows the info toast.
 * @param page The test's page.
 * @returns The form's Save button.
 */
async function openEdit(page: Page) {
  await serveItems(page, [FILTER]);
  await page.goto("/inventory");
  await inventory(page).edit("Filtro de óleo").click();
  return itemForm(page, "Editar item").save;
}

// Samples a toast's opacity every frame, from the save until it leaves the page: it starts transparent and rises to full
// opacity, and once its time is up it fades back down before it leaves. Motion is on, which the config turns off.
test("Web: a toast fades in and fades out before it leaves", { tag: [TEST_TAGS.notifications, TEST_TAGS.motion] }, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const save = await openEdit(page);
  const sampled = sampleOpacity(page, "gone");
  await save.click();
  const opacities = await sampled;
  const full = opacities.indexOf(1);
  expect(opacities[0]).toBeLessThan(0.5);
  expect(full).toBeGreaterThan(0);
  const fadingOut = opacities.slice(full).filter((opacity) => opacity < 1);
  expect(fadingOut.some((opacity) => opacity > 0)).toBe(true);
  expect(fadingOut.at(-1)).toBeLessThan(0.5);
});

// With reduced motion, the toast is at full opacity from its first frame.
test("Web: with reduced motion a toast shows at once", { tag: [TEST_TAGS.notifications, TEST_TAGS.motion] }, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const save = await openEdit(page);
  const shown = sampleOpacity(page, "shown");
  await save.click();
  expect(await shown).toEqual([1]);
});
