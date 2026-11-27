import assert from "node:assert/strict";
import { test } from "node:test";
import { LISTS_TUTORIAL_NAMES, listsTutorialStepCount, listsTutorialSteps, listsTutorialTitle, type ListsTutorialScreen } from "./listsTutorial.ts";

const { first, second, renamed } = LISTS_TUTORIAL_NAMES;

/**
 * Builds a screen the test changes as it goes, with the two test categories among others, recording what the tour asks
 * it to do.
 * @returns The screen and the calls made on it.
 */
function fakeScreen() {
  const calls: string[] = [];
  const screen: ListsTutorialScreen<string> = {
    managing: false,
    categories: ["Motor", first, second],
    merging: false,
    removing: null,
    busy: false,
    phone: false,
    target: (name) => name,
    openLists: () => {
      calls.push("open");
      screen.managing = true;
    },
    rename: (from, to) => {
      calls.push(`rename ${from} → ${to}`);
      screen.categories = screen.categories.map((name) => (name === from ? to : name));
    },
    merge: (from, into) => {
      calls.push(`merge ${from} → ${into}`);
      screen.categories = screen.categories.filter((name) => name !== from);
    },
    remove: (name) => {
      calls.push(`remove ${name}`);
      screen.categories = screen.categories.filter((each) => each !== name);
    },
  };
  return { screen, calls };
}

// Lists the steps and checks their order, what each points at, which only show, the phone's words, and the tour's name
// and step count.
test("Shared: the lists tour opens Gerenciar listas, renames, joins and deletes the test categories", () => {
  const { screen } = fakeScreen();
  const steps = listsTutorialSteps(() => screen, "pt-BR");
  assert.deepEqual(
    steps.map((step) => [step.id, step.part, step.target?.()]),
    [
      ["open", 1, "more-actions"],
      ["rename", 1, "entry-first"],
      ["join", 1, "entry-renamed"],
      ["merge", 1, "merge"],
      ["delete", 1, "entry-second"],
      ["confirm", 1, "remove-confirm"],
      ["end", undefined, undefined],
    ],
  );
  screen.phone = true;
  assert.equal(listsTutorialSteps(() => screen, "pt-BR")[3].text, "Toque em Juntar: os itens de uma passam para a outra, e só Categoria de teste 2 fica.");
  assert.equal(listsTutorialSteps(() => screen, "en-US")[2].title, "Join with another");
  assert.deepEqual(
    [listsTutorialTitle("pt-BR"), listsTutorialTitle("en-US"), listsTutorialStepCount()],
    ["Renomear e juntar nomes das listas", "Renaming and joining list names", 7],
  );
});

// Walks the tour with "Fazer por mim" and checks each step is done only once the screen shows it: the dialog open, the
// first renamed, the merge asked or done, the second asked about or deleted, and no test category left, the others kept.
test("Shared: each lists step is done once the screen shows it", () => {
  const { screen, calls } = fakeScreen();
  const step = (id: string) => listsTutorialSteps(() => screen, "pt-BR").find((each) => each.id === id)!;
  assert.equal(step("open").done?.(), false);
  step("open").auto?.();
  assert.equal(step("open").done?.(), true);
  assert.equal(step("rename").done?.(), false);
  step("rename").auto?.();
  assert.equal(step("rename").done?.(), true);
  assert.equal(step("join").done?.(), false);
  screen.merging = true;
  assert.equal(step("join").done?.(), true);
  assert.equal(step("merge").done?.(), false);
  step("merge").auto?.();
  screen.merging = false;
  assert.equal(step("merge").done?.(), true);
  assert.equal(step("delete").done?.(), false);
  screen.removing = second;
  assert.equal(step("delete").done?.(), true);
  step("confirm").auto?.();
  assert.equal(step("confirm").done?.(), false);
  screen.removing = null;
  assert.equal(step("confirm").done?.(), true);
  assert.deepEqual(screen.categories, ["Motor"]);
  assert.deepEqual(calls, ["open", `rename ${first} → ${renamed}`, `merge ${renamed} → ${second}`, `remove ${second}`]);
});

// Checks where each step goes back to: the dialog closed goes back to opening it, but not while a change is on its way;
// the merge question closed with the renamed category still there goes back to the join; the delete question closed
// with the second still there goes back to the delete.
test("Shared: a lists step left goes back to where it can be done again", () => {
  const { screen } = fakeScreen();
  const step = (id: string) => listsTutorialSteps(() => screen, "pt-BR").find((each) => each.id === id)!;
  for (const id of ["rename", "join", "merge", "delete", "confirm"]) {
    assert.equal(step(id).lost?.(), "open", id);
  }
  screen.busy = true;
  assert.equal(step("merge").lost?.(), null);
  screen.busy = false;
  screen.managing = true;
  screen.categories = ["Motor", renamed, second];
  assert.equal(step("merge").lost?.(), "join");
  screen.merging = true;
  assert.equal(step("merge").lost?.(), null);
  screen.categories = ["Motor", second];
  assert.equal(step("confirm").lost?.(), "delete");
  screen.removing = second;
  assert.equal(step("confirm").lost?.(), null);
});
