import assert from "node:assert/strict";
import { test } from "node:test";
import type { Item } from "./items.ts";
import { testItem } from "./testItems.ts";
import { photosTutorialStepCount, photosTutorialSteps, photosTutorialTitle, type PhotosTutorialScreen } from "./photosTutorial.ts";

// The test item as the API would send it back, with no photos yet.
const SAVED: Item = testItem({ id: "00000000-0000-4000-8000-000000000001", code: "TUTORIAL-001", name: "Item de teste do tutorial" });

/**
 * Builds a screen the test changes as it goes, recording what the tour asks it to do.
 * @returns The screen and the calls made on it.
 */
function fakeScreen() {
  const calls: string[] = [];
  const screen: PhotosTutorialScreen<string> = {
    form: null,
    items: [SAVED],
    busy: false,
    phone: false,
    target: (name) => name,
    openForm: (item, details) => {
      calls.push(`open ${details ? "details" : "edit"}`);
      screen.form = { item, viewing: details, photos: screen.form?.photos ?? 0 };
    },
    addSamplePhotos: () => {
      calls.push("add");
      screen.form = { ...screen.form!, photos: screen.form!.photos + 2 };
    },
    removeFirstPhoto: () => {
      calls.push("remove");
      screen.form = { ...screen.form!, photos: screen.form!.photos - 1 };
    },
    savePhotos: () => {
      calls.push("save");
    },
  };
  return { screen, calls };
}

// Lists the steps and checks their order, that every one but "Pronto!" is in the tour's one part, what each points
// at, the phone's words, and the tour's name and step count.
test("Shared: the photos tour opens the test item, adds two photos, takes out the first and saves", () => {
  const { screen } = fakeScreen();
  const steps = photosTutorialSteps(() => screen, "pt-BR");
  assert.deepEqual(
    steps.map((step) => [step.id, step.part, step.target?.()]),
    [
      ["open", 1, "row"],
      ["unlock", 1, "form-edit"],
      ["add", 1, "form-photos"],
      ["remove", 1, "photo-remove"],
      ["save", 1, "form-save"],
      ["end", undefined, undefined],
    ],
  );
  assert.equal(steps[2].text, "Arraste duas fotos para o campo de fotos da marca, ou clique nele e escolha duas. Fazer por mim usa duas fotos de exemplo.");
  screen.phone = true;
  assert.equal(photosTutorialSteps(() => screen, "pt-BR")[2].text, "Toque em Galeria e escolha duas fotos. Fazer por mim usa duas fotos de exemplo.");
  assert.equal(photosTutorialSteps(() => screen, "en-US")[3].title, "Take out the first");
  assert.deepEqual([photosTutorialTitle("pt-BR"), photosTutorialTitle("en-US"), photosTutorialStepCount()], ["Fotos de uma marca", "A brand's photos", 6]);
});

// Walks the tour with "Fazer por mim" and checks each step is done only once the screen shows it: the details or the
// edit open on the test item, the edit, two photos held, one left, and the brand saved with one photo and the form
// closed.
test("Shared: each photos step is done once the screen shows it", () => {
  const { screen, calls } = fakeScreen();
  const [open, unlock, add, remove, save] = photosTutorialSteps(() => screen, "pt-BR");
  assert.equal(open.done?.(), false);
  open.auto?.();
  assert.equal(open.done?.(), true);
  assert.equal(unlock.done?.(), false);
  unlock.auto?.();
  assert.equal(unlock.done?.(), true);
  assert.equal(add.done?.(), false);
  add.auto?.();
  assert.equal(add.done?.(), true);
  assert.equal(remove.done?.(), false);
  remove.auto?.();
  assert.equal(remove.done?.(), true);
  save.auto?.();
  assert.equal(save.done?.(), false);
  screen.form = null;
  screen.items = [{ ...SAVED, brands: [{ ...SAVED.brands[0], photos: [{ id: "p2", url: "/photos/p2.webp", thumbUrl: "/photos/p2-thumb.webp" }] }] }];
  assert.equal(save.done?.(), true);
  assert.deepEqual(calls, ["open details", "open edit", "add", "remove", "save"]);
});

// Checks where each step goes back to: the form closed goes back to opening the test item, but not while a change is
// on its way; both photos taken out go back to adding them; and a save that closed the form with the photo saved stays.
test("Shared: a photos step left goes back to where it can be done again", () => {
  const { screen } = fakeScreen();
  const steps = photosTutorialSteps(() => screen, "pt-BR");
  const step = (id: string) => steps.find((each) => each.id === id)!;
  for (const id of ["unlock", "add", "remove", "save"]) {
    assert.equal(step(id).lost?.(), "open", id);
  }
  screen.busy = true;
  assert.equal(step("save").lost?.(), null);
  screen.busy = false;
  screen.form = { item: SAVED, viewing: false, photos: 0 };
  assert.equal(step("remove").lost?.(), "add");
  screen.form.photos = 1;
  assert.equal(step("remove").lost?.(), null);
  screen.form = null;
  screen.items = [{ ...SAVED, brands: [{ ...SAVED.brands[0], photos: [{ id: "p2", url: "/photos/p2.webp", thumbUrl: "/photos/p2-thumb.webp" }] }] }];
  assert.equal(step("save").lost?.(), null);
});
