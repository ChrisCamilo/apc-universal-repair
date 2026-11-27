import assert from "node:assert/strict";
import { test } from "node:test";
import { importedItems, readItemsCsv } from "./itemCsv.ts";
import type { Item } from "./items.ts";
import { EMPTY_ITEM_LISTS } from "./lists.ts";
import { testItem } from "./testItems.ts";
import {
  IMPORT_TUTORIAL_CODES,
  IMPORT_TUTORIAL_CSV,
  importTutorialStepCount,
  importTutorialSteps,
  importTutorialTitle,
  isImportTestItem,
  type ImportTutorialScreen,
} from "./importTutorial.ts";

/**
 * Builds a screen the test changes as it goes, recording what the tour asks it to do.
 * @returns The screen and the calls made on it.
 */
function fakeScreen() {
  const calls: string[] = [];
  const screen: ImportTutorialScreen<string> = {
    importer: null,
    templateTaken: false,
    items: [],
    busy: false,
    phone: false,
    target: (name) => name,
    openImporter: () => {
      calls.push("open");
      screen.importer = { codes: [], errors: 0 };
    },
    takeTemplate: () => {
      calls.push("template");
      screen.templateTaken = true;
    },
    chooseSample: () => {
      calls.push("choose");
      screen.importer = { codes: [...IMPORT_TUTORIAL_CODES], errors: 0 };
    },
    importSample: () => {
      calls.push("import");
    },
  };
  return { screen, calls };
}

// The test items as the API would send them back once imported.
const IMPORTED: Item[] = IMPORT_TUTORIAL_CODES.map((code, index) => testItem({ id: `00000000-0000-4000-8000-00000000000${index}`, code, name: `Item de teste do CSV ${index + 1}` }));

// Reads the sample file as the import does, with empty lists, and checks it holds the two test items, both ready, the
// second with no stock, and that only they count as the tour's test items.
test("Shared: the import tour's sample file holds two test items, both ready", () => {
  const read = readItemsCsv(IMPORT_TUTORIAL_CSV, EMPTY_ITEM_LISTS, "pt-BR");
  assert.ok("rows" in read);
  assert.deepEqual(read.rows.map((row) => row.errors), [[], []]);
  assert.deepEqual(
    importedItems(read.rows).map((item) => [item.brands[0].code, item.name, item.brands[0].quantity]),
    [
      ["TUTORIAL-CSV-1", "Item de teste do CSV 1", 3],
      ["TUTORIAL-CSV-2", "Item de teste do CSV 2", 0],
    ],
  );
  assert.deepEqual([isImportTestItem(IMPORTED[1]), isImportTestItem(testItem({ code: "TUTORIAL-001" })), isImportTestItem(undefined)], [true, false, false]);
});

// Lists the steps and checks their order, what each points at, which only show (Next), the phone's words, and the
// tour's name and step count.
test("Shared: the import tour opens Importar Peças, takes the template, reads the sample, imports it and shows it", () => {
  const { screen } = fakeScreen();
  const steps = importTutorialSteps(() => screen, "pt-BR");
  assert.deepEqual(
    steps.map((step) => [step.id, step.part, step.target?.(), Boolean(step.done)]),
    [
      ["open", 1, "more-actions", true],
      ["template", 1, "import-template", true],
      ["choose", 1, "import-choose", true],
      ["review", 1, "import-preview", false],
      ["import", 1, "import-submit", true],
      ["list", 1, "row", false],
      ["end", undefined, undefined, false],
    ],
  );
  screen.phone = true;
  assert.equal(importTutorialSteps(() => screen, "pt-BR")[0].text, "Toque no ⋯ do Estoque e em Importar Peças.");
  assert.equal(importTutorialSteps(() => screen, "en-US")[4].title, "Import");
  assert.deepEqual([importTutorialTitle("pt-BR"), importTutorialTitle("en-US"), importTutorialStepCount()], ["Importar um CSV", "Importing a CSV", 7]);
});

// Walks the tour with "Fazer por mim" and checks each step is done only once the screen shows it: the dialog open, the
// template taken, the sample read with every row ready, and both test items in stock with the dialog closed.
test("Shared: each import step is done once the screen shows it", () => {
  const { screen, calls } = fakeScreen();
  const step = (id: string) => importTutorialSteps(() => screen, "pt-BR").find((each) => each.id === id)!;
  assert.equal(step("open").done?.(), false);
  step("open").auto?.();
  assert.equal(step("open").done?.(), true);
  assert.equal(step("template").done?.(), false);
  step("template").auto?.();
  assert.equal(step("template").done?.(), true);
  assert.equal(step("choose").done?.(), false);
  screen.importer = { codes: [...IMPORT_TUTORIAL_CODES], errors: 1 };
  assert.equal(step("choose").done?.(), false);
  step("choose").auto?.();
  assert.equal(step("choose").done?.(), true);
  step("import").auto?.();
  screen.items = [IMPORTED[0]];
  screen.importer = null;
  assert.equal(step("import").done?.(), false);
  screen.items = IMPORTED;
  assert.equal(step("import").done?.(), true);
  assert.deepEqual(calls, ["open", "template", "choose", "import"]);
});

// Checks where each step goes back to: the dialog closed goes back to opening it, but not while a change is on its
// way; another file read goes back from the preview to choosing; and the import done with the dialog closed stays.
test("Shared: an import step left goes back to where it can be done again", () => {
  const { screen } = fakeScreen();
  const step = (id: string) => importTutorialSteps(() => screen, "pt-BR").find((each) => each.id === id)!;
  for (const id of ["template", "choose", "review", "import"]) {
    assert.equal(step(id).lost?.(), "open", id);
  }
  screen.busy = true;
  assert.equal(step("import").lost?.(), null);
  screen.busy = false;
  screen.importer = { codes: ["W 712/95"], errors: 0 };
  assert.equal(step("review").lost?.(), "choose");
  screen.importer = { codes: [...IMPORT_TUTORIAL_CODES], errors: 0 };
  assert.equal(step("review").lost?.(), null);
  screen.importer = null;
  screen.items = IMPORTED;
  assert.equal(step("import").lost?.(), null);
});
