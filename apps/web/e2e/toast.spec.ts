import { expect, test, type Page } from "@playwright/test";
import type { Item } from "@apc/shared/items";
import { THEME_STORAGE_KEYS, themes, type Mode, type Style } from "@apc/shared/theme";
import { TOAST_KIND_LOOKS, type ToastKind } from "@apc/shared/toast";
import { savedItem, serveItems } from "./items.ts";
import { signIn } from "./session.ts";
import { testItem } from "@apc/shared/test-items";

// A 1×1 PNG, what the API answers for a photo.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
// One night and one day theme, so each kind is checked in both modes.
const THEMES: [Style, Mode][] = [
  ["eighties", "night"],
  ["gt4", "day"],
];
const FILTER: Item = testItem({
  id: "00000000-0000-4000-8000-000000000001",
  code: "W 712/95",
  name: "Filtro de óleo",
  category: "Motor",
  partBrand: "Mann",
  vehicleBrand: "Volkswagen",
  vehicleModel: null,
  position: "N/A",
  side: "N/A",
  color: "N/A",
  location: "A-2",
  quantity: 8,
  minQuantity: 2,
  unitPriceCents: 3990,
  photos: [],
  createdAt: "2026-10-03T12:00:00.000Z",
  updatedAt: "2026-10-03T12:00:00.000Z",
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
  const pill = page.getByRole(look.urgent ? "alert" : "status").getByTestId("common.toast.message").filter({ hasText: message });
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
 * @returns The form's dialog.
 */
async function fillNewItem(page: Page) {
  await page.getByRole("button", { name: "Novo item" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo item" });
  await dialog.getByLabel("Código da peça").fill("NGK-B7");
  await dialog.getByLabel("Nome").fill("Vela de ignição");
  await dialog.getByRole("combobox", { name: "Categoria" }).fill("Motor");
  await dialog.getByRole("combobox", { name: "Marca da peça" }).fill("Mann");
  await dialog.getByRole("combobox", { name: "Marca do veículo" }).fill("Volkswagen");
  await dialog.getByLabel("Valor unitário (R$)").fill("34,9");
  return dialog;
}

/**
 * Converts a hex color to the `rgb(r, g, b)` form the browser reports for computed styles.
 * @param hex Color as `#RRGGBB`.
 * @returns The same color as `rgb(r, g, b)`.
 */
function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
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

// Every test here starts on the Inventory, so a test user is logged in first.
test.beforeEach(async ({ page }) => {
  await signIn(page);
});

for (const theme of THEMES) {
  // Adds an item through the form against an API that saves it, and checks the success toast in green with the check.
  test(`Web: a saved item shows a success toast in ${theme.join("/")}`, async ({ page }) => {
    await startIn(page, theme);
    const stock = [FILTER];
    await page.route("**/api/items", (route) => {
      const saved = { ...savedItem(route.request().postDataJSON()), id: "00000000-0000-4000-8000-000000000002" };
      stock.unshift(saved);
      return route.fulfill({ status: 201, json: saved });
    });
    await serveItems(page, stock);
    await page.goto("/inventory");
    await (await fillNewItem(page)).getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, "success", "Item “Vela de ignição” cadastrado.", theme);
  });

  // Saves an item while the API fails, and checks the error toast in red with the X, read out at once, and the form
  // stays open.
  test(`Web: a failed save shows an error toast in ${theme.join("/")}`, async ({ page }) => {
    await startIn(page, theme);
    await page.route("**/api/items", (route) => route.fulfill({ status: 500, body: "" }));
    await serveItems(page, [FILTER]);
    await page.goto("/inventory");
    const dialog = await fillNewItem(page);
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, "error", "Não foi possível salvar o item. Tente de novo.", theme);
    await expect(dialog).toBeVisible();
  });

  // Removes an item's photo in the edit form while the API can't save photos, and checks the warning toast in yellow
  // with the "!", read out at once: the item is saved, its photos aren't.
  test(`Web: photos that fail to save show a warning toast in ${theme.join("/")}`, async ({ page }) => {
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
    await page.getByRole("button", { name: "Editar Filtro de óleo" }).click();
    const dialog = page.getByRole("dialog", { name: "Editar item" });
    await dialog.getByRole("button", { name: "Remover foto 1" }).click();
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, "warning", "Item “Filtro de óleo” salvo, mas as fotos não foram salvas. Tente de novo.", theme);
  });

  // Saves an item's edit form without changing anything, and checks nothing is sent and the info toast in blue with the
  // "i" says there is nothing to save.
  test(`Web: an unchanged edit shows an info toast in ${theme.join("/")}`, async ({ page }) => {
    await startIn(page, theme);
    const patched: string[] = [];
    await serveItems(page, [FILTER]);
    await page.route("**/api/items/*", (route) => {
      patched.push(route.request().url());
      return route.fulfill({ json: FILTER });
    });
    await page.goto("/inventory");
    await page.getByRole("button", { name: "Editar Filtro de óleo" }).click();
    const dialog = page.getByRole("dialog", { name: "Editar item" });
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, "info", "Nenhuma alteração para salvar.", theme);
    await expect(dialog).toBeHidden();
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
  await page.getByRole("button", { name: "Editar Filtro de óleo" }).click();
  return page.getByRole("dialog", { name: "Editar item" }).getByRole("button", { name: "Salvar" });
}

// Samples a toast's opacity every frame, from the save until it leaves the page: it starts transparent and rises to full
// opacity, and once its time is up it fades back down before it leaves.
test("Web: a toast fades in and fades out before it leaves", async ({ page }) => {
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
test("Web: with reduced motion a toast shows at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const save = await openEdit(page);
  const shown = sampleOpacity(page, "shown");
  await save.click();
  expect(await shown).toEqual([1]);
});
