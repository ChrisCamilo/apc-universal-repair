// Guided tour behavior shared by the web and mobile Tour: what a step is, where the step card goes next to
// the target, how far the spotlight reaches around it, and the text of the card's header.

/** How long a step whose check passed stays on screen before the next one, in ms, so the user sees it worked. */
export const TOUR_ADVANCE_DELAY_MS = 450;
/** Room between the card and the target or the screen edges, in px. */
export const TOUR_CARD_GAP = 12;
/** Widest card, in px. */
export const TOUR_CARD_WIDTH = 340;
/** How often the tour checks whether the current step is done or was left, in ms. */
export const TOUR_CHECK_MS = 200;
/** At or below this screen width, in px, the card is pinned to the bottom of the screen. */
export const TOUR_PHONE_WIDTH = 520;
/** Room the spotlight leaves around the target, in px. */
export const TOUR_SPOT_PADDING = 6;

/** A box on screen, in px from the top left corner. */
export type TourRect = { x: number; y: number; width: number; height: number };
/** A step of a guided tour. `Target` is what the platform points at: an element on the web, a view on mobile. */
export type TourStep<Target> = {
  /** Unique within the tour; `lost` returns one to go back to. */
  id: string;
  title: string;
  text: string;
  /** Part the step belongs to, from 1; the card header names it from the tour's parts. */
  part?: number;
  /** Finds what the step points at; without a target the card sits in the middle of the screen. */
  target?: () => Target | null;
  /** Tells whether the user did what the step asks, and the tour moves on by itself. Info-only steps leave it out and use Next. */
  done?: () => boolean;
  /** Does the step for the user, behind "Fazer por mim". */
  auto?: () => void;
  /** Names the step to go back to when the user leaves this one, e.g. closes the dialog it happens in, or null to stay. */
  lost?: () => string | null;
};

/**
 * Places the step card: below the target when it fits, above it otherwise, or at the bottom of the screen
 * when neither fits; in the middle of the screen without a target; and across the bottom at phone width.
 * The card never leaves the screen edges.
 * @param target Box of the target, or null.
 * @param cardHeight Height of the card, in px.
 * @param screen Size of the screen, in px.
 * @returns Left and top corner of the card and its width, in px.
 */
export function cardPlacement(
  target: TourRect | null,
  cardHeight: number,
  screen: { width: number; height: number },
): { x: number; y: number; width: number } {
  const gap = TOUR_CARD_GAP;
  const bottom = screen.height - cardHeight - gap;
  if (screen.width <= TOUR_PHONE_WIDTH) {
    return { x: gap, y: bottom, width: screen.width - 2 * gap };
  }
  const width = Math.min(TOUR_CARD_WIDTH, screen.width - 2 * gap);
  if (!target) {
    return { x: (screen.width - width) / 2, y: Math.max(gap, (screen.height - cardHeight) / 2), width };
  }
  let y = target.y + target.height + gap;
  if (y > bottom) {
    y = target.y - cardHeight - gap;
  }
  if (y < gap) {
    y = bottom;
  }
  return { x: Math.min(Math.max(gap, target.x), screen.width - width - gap), y: Math.max(gap, y), width };
}

/**
 * Grows the target's box by the spotlight's padding, so the ring sits just outside the target.
 * @param target Box of the target.
 * @returns Box of the spotlight.
 */
export function spotlightRect(target: TourRect): TourRect {
  const pad = TOUR_SPOT_PADDING;
  return { x: target.x - pad, y: target.y - pad, width: target.width + 2 * pad, height: target.height + 2 * pad };
}

/**
 * Writes the card header: the step's part, named from the tour's parts, and its position in the tour.
 * @param steps Every step of the tour.
 * @param index Index of the current step.
 * @param parts Names of the tour's parts, e.g. ["Criar um item", "Procurar e filtrar"].
 * @returns E.g. { part: "Parte 1 de 3 · Criar um item", count: "2 / 18" }; the last step without a part reads
 * "Tutorial concluído", any other step without a part has no part text.
 */
export function stepHeader<Target>(
  steps: readonly TourStep<Target>[],
  index: number,
  parts: readonly string[],
): { part: string; count: string } {
  const { part } = steps[index];
  const last = index === steps.length - 1;
  return {
    part: part ? `Parte ${part} de ${parts.length} · ${parts[part - 1]}` : last ? "Tutorial concluído" : "",
    count: `${index + 1} / ${steps.length}`,
  };
}

/**
 * Finds a step by its id, for `lost`.
 * @param steps Every step of the tour.
 * @param id Id of the step.
 * @returns Its index, or 0 when no step has that id.
 */
export function stepIndex<Target>(steps: readonly TourStep<Target>[], id: string): number {
  return Math.max(0, steps.findIndex((step) => step.id === id));
}
