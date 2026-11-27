import assert from "node:assert/strict";
import { test } from "node:test";
import type { CatalogBrand, CatalogNode, CatalogValues } from "./catalog.ts";
import {
  CATALOG_TREE_NAMES,
  CATALOG_TREE_VALUES,
  catalogTreeNodes,
  catalogTreeTutorialStepCount,
  catalogTreeTutorialSteps,
  catalogTreeTutorialTitle,
  type CatalogTreeScreen,
} from "./catalogTreeTutorial.ts";

/**
 * Builds a screen whose brand grows as the tour asks it to, recording what it is asked.
 * @returns The screen and the calls made on it.
 */
function fakeScreen() {
  const calls: string[] = [];
  let made = 0;
  const node = (level: CatalogNode["level"], label: string): CatalogNode => ({ id: `n${++made}`, level, label, children: [] });
  const screen: CatalogTreeScreen<string> = {
    brand: { id: "b1", name: "Chevrolet", mark: "CH", models: [node("model", "Opala")] } as CatalogBrand,
    busy: false,
    phone: false,
    target: (name, under) => (under ? `${name} ${under.label}` : name),
    addModel: () => {
      calls.push("model");
      screen.brand!.models = [...screen.brand!.models, node("model", CATALOG_TREE_NAMES.model)];
    },
    addUnder: (parent: CatalogNode, values: CatalogValues) => {
      calls.push(`${parent.label} ← ${values.name ?? values.year ?? values.displacementDl}`);
      const level = ({ model: "generation", generation: "version", version: "year", year: "engine" } as const)[parent.level as "model"];
      parent.children = [...(parent.children ?? []), node(level, values.name ?? `${values.year ?? "1.0"}`)];
    },
    moveUp: (moved) => {
      calls.push(`up ${moved.label}`);
      const generation = catalogTreeNodes(screen.brand).generation!;
      generation.children = [moved, ...generation.children!.filter((each) => each !== moved)];
    },
  };
  return { screen, calls };
}

// Lists the steps and checks their order, what each points at, the phone's words, and the tour's name and step count.
test("Shared: the Catalog tree tour adds a test model and its tree, then moves a version", () => {
  const { screen } = fakeScreen();
  const steps = catalogTreeTutorialSteps(() => screen, "pt-BR");
  assert.deepEqual(
    steps.map((step) => [step.id, step.part]),
    [
      ["model", 1],
      ["generation", 1],
      ["version", 1],
      ["period", 1],
      ["engine", 1],
      ["second", 1],
      ["move", 1],
      ["end", undefined],
    ],
  );
  assert.equal(steps[0].target?.(), "new-model");
  screen.phone = true;
  assert.equal(catalogTreeTutorialSteps(() => screen, "pt-BR")[2].text, "Toque no ⋯ da geração, em Nova versão, e adicione “Versão de teste 1”.");
  assert.equal(catalogTreeTutorialSteps(() => screen, "en-US")[6].title, "Change the order");
  assert.deepEqual([catalogTreeTutorialTitle("pt-BR"), catalogTreeTutorialTitle("en-US"), catalogTreeTutorialStepCount()], ["Montar a árvore de um modelo", "Building a model's tree", 8]);
});

// Walks the tour with "Fazer por mim" and checks each step is done only once the brand shows it, each pointing at what
// adds under the node before it, the engine added with its sheet, and the second version moved before the first.
test("Shared: each Catalog tree step is done once the brand shows it", () => {
  const { screen, calls } = fakeScreen();
  const step = (id: string) => catalogTreeTutorialSteps(() => screen, "pt-BR").find((each) => each.id === id)!;
  for (const id of ["model", "generation", "version", "period", "engine", "second", "move"]) {
    assert.equal(step(id).done?.(), false, id);
    step(id).auto?.();
    assert.equal(step(id).done?.(), true, id);
  }
  assert.equal(step("generation").target?.(), `add-under ${CATALOG_TREE_NAMES.model}`);
  assert.equal(step("engine").target?.(), "add-under 2001");
  assert.equal(step("move").target?.(), `move-up ${CATALOG_TREE_NAMES.secondVersion}`);
  assert.deepEqual(calls, [
    "model",
    `${CATALOG_TREE_NAMES.model} ← ${CATALOG_TREE_NAMES.generation}`,
    `${CATALOG_TREE_NAMES.generation} ← ${CATALOG_TREE_NAMES.firstVersion}`,
    `${CATALOG_TREE_NAMES.firstVersion} ← 2001`,
    `2001 ← ${CATALOG_TREE_VALUES.engine.displacementDl}`,
    `${CATALOG_TREE_NAMES.generation} ← ${CATALOG_TREE_NAMES.secondVersion}`,
    `up ${CATALOG_TREE_NAMES.secondVersion}`,
  ]);
  assert.deepEqual(screen.brand!.models.map((model) => model.label), ["Opala", CATALOG_TREE_NAMES.model]);
});

// Checks where each step goes back to: the test model gone goes back to adding it, the generation gone to adding it,
// but not while a change is on its way.
test("Shared: a Catalog tree step left goes back to what is missing", () => {
  const { screen } = fakeScreen();
  const step = (id: string) => catalogTreeTutorialSteps(() => screen, "pt-BR").find((each) => each.id === id)!;
  assert.equal(step("engine").lost?.(), "model");
  step("model").auto?.();
  assert.equal(step("engine").lost?.(), "generation");
  step("generation").auto?.();
  step("version").auto?.();
  assert.equal(step("engine").lost?.(), "period");
  assert.equal(step("move").lost?.(), "second");
  screen.busy = true;
  assert.equal(step("move").lost?.(), null);
});
