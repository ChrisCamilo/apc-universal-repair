import assert from "node:assert/strict";
import { test } from "node:test";
import { inventoryTutorialParts, inventoryTutorialPartSteps } from "../inventory/inventoryTutorial.ts";
import { EXPLANATIONS, explanationSteps, isExplanation, TUTORIAL_PLATFORMS, TUTORIAL_TEXTS, TUTORIALS, tutorialSections, tutorialTitle } from "./tutorials.ts";

/**
 * Lists a section's tutorials by id.
 * @param platform The app.
 * @param feature The section's feature.
 * @returns The ids, in order.
 */
function idsOf(platform: (typeof TUTORIAL_PLATFORMS)[number], feature: string): string[] {
  return tutorialSections(platform, "pt-BR").find((section) => section.feature === feature)?.tutorials.map(({ id }) => id) ?? [];
}

// Lists the dialog's sections in each app, and checks the Inventory's three tutorials come first in all of them, in
// order, as guided tours, each with its part's steps, and are named after the tour's parts, then the tours of a brand's
// photos, of importing a CSV and of the lists.
test("Shared: the tutorials list the Inventory tour's three parts in every app", () => {
  for (const platform of TUTORIAL_PLATFORMS) {
    const [inventory] = tutorialSections(platform, "pt-BR");
    assert.equal(inventory.title, "Estoque");
    assert.deepEqual(
      inventory.tutorials.slice(0, 6).map(({ id, kind, steps }) => [id, kind, steps]),
      [
        ["inventory-add", "tour", 4],
        ["inventory-search", "tour", 4],
        ["inventory-edit", "tour", 10],
        ["inventory-photos", "tour", 6],
        ["inventory-import", "tour", 7],
        ["inventory-lists", "tour", 7],
      ],
    );
  }
  assert.deepEqual(
    TUTORIALS.slice(0, 6).map(({ id }) => tutorialTitle(id, "pt-BR")),
    ["Cadastrar um item", "Procurar e filtrar", "Editar e excluir", "Fotos de uma marca", "Importar um CSV", "Renomear e juntar nomes das listas"],
  );
  assert.deepEqual(tutorialSections("phone", "en-US")[0].title, "Inventory");
});

// Lists the sections of each app and checks every feature has its explanations, after the Inventory's tours: the
// Servidor's only on the desktop and the Modo offline's only on the phone, each section named.
test("Shared: each feature explains itself, the server on the desktop and the offline mode on the phone", () => {
  assert.deepEqual(
    tutorialSections("desktop", "pt-BR").map(({ title }) => title),
    ["Estoque", "Catálogo", "Notificações", "Servidor"],
  );
  assert.deepEqual(
    tutorialSections("phone", "pt-BR").map(({ title }) => title),
    ["Estoque", "Catálogo", "Notificações", "Modo offline"],
  );
  assert.deepEqual(
    tutorialSections("web", "en-US").map(({ title }) => title),
    ["Inventory", "Catalog", "Notifications"],
  );
  assert.deepEqual(idsOf("web", "inventory").slice(6), ["inventory-mercado-livre", "inventory-low-stock"]);
  assert.deepEqual(idsOf("phone", "catalog"), ["catalog-browse", "catalog-tree", "catalog-sheet", "catalog-parts"]);
  assert.deepEqual(idsOf("desktop", "server"), ["server-pairing", "server-devices"]);
  assert.deepEqual(idsOf("phone", "offline"), ["offline-copy", "offline-conflict"]);
});

// Checks every explanation has one to three steps, a target or none for each, its texts in both languages step for
// step, and opens its tab: the Catalog's the Catalog, the offline mode's the Inventory, the bell's and the server's
// none.
test("Shared: an explanation has one to three steps, written in both languages", () => {
  for (const { id, targets } of EXPLANATIONS) {
    assert.ok(targets.length >= 1 && targets.length <= 3, id);
    assert.equal(isExplanation(id), true);
    for (const locale of ["pt-BR", "en-US"] as const) {
      const steps = explanationSteps(id, locale);
      assert.equal(steps.length, targets.length, `${id} ${locale}`);
      assert.ok(steps.every((step) => step.title && step.text), `${id} ${locale}`);
      assert.ok(TUTORIAL_TEXTS[locale].descriptions[id], `${id} ${locale}`);
    }
  }
  assert.equal(isExplanation("inventory-add"), false);
  const tab = (id: string) => TUTORIALS.find((tutorial) => tutorial.id === id)?.tab;
  assert.deepEqual(["catalog-tree", "offline-copy", "notifications-bell", "server-pairing"].map(tab), ["catalog", "inventory", undefined, undefined]);
});

// Lists an explanation's steps in Portuguese and checks each one's id, target and texts, the step with no target
// keeping none, and its name.
test("Shared: an explanation's steps point at their targets", () => {
  assert.deepEqual(explanationSteps("inventory-mercado-livre", "pt-BR"), [
    {
      id: "inventory-mercado-livre-1",
      target: "more-actions",
      title: "Exportar Peças",
      text: "Em Mais ações, Exportar Peças tem Exportar para o Mercado Livre, que gera um anúncio por marca de peça com estoque.",
    },
    {
      id: "inventory-mercado-livre-2",
      target: null,
      title: "No Mercado Livre",
      text: "No computador sai um zip com a planilha dos anúncios, para copiar no Anunciador em massa, e as fotos nomeadas pelo código, para o Gestor de fotos. O celular compartilha só a planilha.",
    },
  ]);
  assert.equal(tutorialTitle("inventory-mercado-livre", "pt-BR"), "Exportar para o Mercado Livre");
});

// Checks the dialog's texts in Portuguese: one and many tutorials and steps, the kinds, and a description for each
// tutorial.
test("Shared: the tutorials' texts are written in Portuguese", () => {
  const texts = TUTORIAL_TEXTS["pt-BR"];
  assert.deepEqual([texts.title, texts.count(1), texts.count(3), texts.steps(1), texts.steps(10)], ["Tutoriais", "1 tutorial", "3 tutoriais", "1 passo", "10 passos"]);
  assert.deepEqual([texts.kinds.tour, texts.kinds.explanation], ["Tour guiado", "Explicação"]);
  for (const { id } of TUTORIALS) {
    assert.ok(texts.descriptions[id] && TUTORIAL_TEXTS["en-US"].descriptions[id], id);
  }
});

// Checks a tutorial run alone goes through its own part, and one run onward through the next ones, as the first time;
// and that the parts' steps add up to the tour's, but its "Pronto!".
test("Shared: a tutorial runs its own part, or on through the next ones", () => {
  assert.deepEqual(inventoryTutorialParts("inventory-search", false), [2]);
  assert.deepEqual(inventoryTutorialParts("inventory-add", true), [1, 2, 3]);
  assert.deepEqual(inventoryTutorialParts("inventory-search", true), [2, 3]);
  assert.equal(inventoryTutorialPartSteps(1) + inventoryTutorialPartSteps(2) + inventoryTutorialPartSteps(3), 18);
});
