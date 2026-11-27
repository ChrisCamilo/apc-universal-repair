import assert from "node:assert/strict";
import { test } from "node:test";
import { inventoryTutorialParts, inventoryTutorialPartSteps } from "../inventory/inventoryTutorial.ts";
import { TUTORIAL_PLATFORMS, TUTORIAL_TEXTS, TUTORIALS, tutorialSections, tutorialTitle } from "./tutorials.ts";

// Lists the dialog's sections in each app, and checks the Inventory's three tutorials show in all of them, in order,
// as guided tours, each with its part's steps, and are named after the tour's parts.
test("Shared: the tutorials list the Inventory tour's three parts in every app", () => {
  for (const platform of TUTORIAL_PLATFORMS) {
    const [inventory, ...rest] = tutorialSections(platform, "pt-BR");
    assert.deepEqual(rest, [], platform);
    assert.equal(inventory.title, "Estoque");
    assert.deepEqual(
      inventory.tutorials.map(({ id, kind, steps }) => [id, kind, steps]),
      [
        ["inventory-add", "tour", 4],
        ["inventory-search", "tour", 4],
        ["inventory-edit", "tour", 10],
      ],
    );
  }
  assert.deepEqual(
    TUTORIALS.map(({ id }) => tutorialTitle(id, "pt-BR")),
    ["Cadastrar um item", "Procurar e filtrar", "Editar e excluir"],
  );
  assert.deepEqual(tutorialSections("phone", "en-US")[0].title, "Inventory");
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
