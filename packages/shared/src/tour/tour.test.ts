import assert from "node:assert/strict";
import { test } from "node:test";
import { cardPlacement, spotlightRect, stepHeader, stepIndex, TOUR_CARD_GAP, TOUR_CARD_WIDTH, type TourStep } from "./tour.ts";

const DESKTOP = { width: 1280, height: 720 };
const STEPS: TourStep<never>[] = [
  { id: "new", part: 1, title: "Abra o cadastro", text: "Clique em Novo item." },
  { id: "search", part: 2, title: "Procure pelo nome", text: "Digite “teste” na busca." },
  { id: "end", title: "Pronto!", text: "Você terminou o tutorial." },
];

// Places the card next to targets high, low and filling the screen, and checks it goes below when it fits,
// above when it doesn't, and to the bottom of the screen when neither fits.
test("Shared: the tour card goes below the target, above it, or to the bottom", () => {
  const below = cardPlacement({ x: 100, y: 80, width: 120, height: 40 }, 200, DESKTOP);
  assert.deepEqual(below, { x: 100, y: 80 + 40 + TOUR_CARD_GAP, width: TOUR_CARD_WIDTH });
  const above = cardPlacement({ x: 100, y: 600, width: 120, height: 40 }, 200, DESKTOP);
  assert.equal(above.y, 600 - 200 - TOUR_CARD_GAP);
  const bottom = cardPlacement({ x: 100, y: 100, width: 120, height: 560 }, 200, DESKTOP);
  assert.equal(bottom.y, 720 - 200 - TOUR_CARD_GAP);
});

// Places the card next to a target at the right edge and without a target, and checks it stays inside the
// screen edges and sits in the middle when there is nothing to point at.
test("Shared: the tour card stays on screen and centers without a target", () => {
  const right = cardPlacement({ x: 1240, y: 80, width: 30, height: 30 }, 200, DESKTOP);
  assert.equal(right.x, 1280 - TOUR_CARD_WIDTH - TOUR_CARD_GAP);
  assert.deepEqual(cardPlacement(null, 200, DESKTOP), { x: (1280 - TOUR_CARD_WIDTH) / 2, y: 260, width: TOUR_CARD_WIDTH });
});

// Places the card on a 360×780 phone and checks it spans the width inside the gaps, pinned to the bottom,
// wherever the target is.
test("Shared: at phone width the tour card is pinned to the bottom", () => {
  const phone = { width: 360, height: 780 };
  const expected = { x: TOUR_CARD_GAP, y: 780 - 220 - TOUR_CARD_GAP, width: 360 - 2 * TOUR_CARD_GAP };
  assert.deepEqual(cardPlacement({ x: 20, y: 40, width: 100, height: 40 }, 220, phone), expected);
  assert.deepEqual(cardPlacement(null, 220, phone), expected);
});

// Grows a target's box and checks the spotlight reaches the same distance past every side.
test("Shared: the spotlight reaches just past the target", () => {
  assert.deepEqual(spotlightRect({ x: 100, y: 50, width: 80, height: 30 }), { x: 94, y: 44, width: 92, height: 42 });
});

// Writes the header of a step in a part, of the last step and of a step found by id, and checks the part is
// named with its number out of all parts, the count runs over every step, and the last step reads concluded.
test("Shared: the tour card header names the part and counts the steps", () => {
  const parts = ["Criar um item", "Procurar e filtrar"];
  assert.deepEqual(stepHeader(STEPS, 0, parts), { part: "Parte 1 de 2 · Criar um item", count: "1 / 3" });
  assert.deepEqual(stepHeader(STEPS, stepIndex(STEPS, "search"), parts), { part: "Parte 2 de 2 · Procurar e filtrar", count: "2 / 3" });
  assert.deepEqual(stepHeader(STEPS, 2, parts), { part: "Tutorial concluído", count: "3 / 3" });
  assert.equal(stepIndex(STEPS, "missing"), 0);
});
