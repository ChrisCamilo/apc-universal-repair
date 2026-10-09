// Filter behavior shared by the web and mobile Select, FilterChip and FilterMenu, so both platforms
// summarize, toggle and count filters the same way.

/**
 * The FilterMenu panel's widest size and the room it leaves around it on a narrow screen, in spacing units (scales.space
 * s1, 4px): 360px, or the screen less 80px.
 */
export const FILTER_PANEL_SPACING = { inset: 20, width: 90 };
/** Options a Select or Combobox list shows at once; the rest are reached by scrolling. */
export const SELECT_VISIBLE_OPTIONS = 5;

/** Chosen values per filter key; an empty list means the filter is off. */
export type FilterValues = Record<string, string[]>;

/**
 * Counts the filters with at least one value chosen, for the FilterMenu button.
 * @param values Chosen values per filter key.
 * @returns How many filters are on.
 */
export function activeFilterCount(values: FilterValues): number {
  return Object.values(values).filter((chosen) => chosen.length > 0).length;
}

/**
 * Turns every filter off, keeping the keys.
 * @param values Chosen values per filter key.
 * @returns The same keys, each with no value chosen.
 */
export function clearedFilters(values: FilterValues): FilterValues {
  return Object.fromEntries(Object.keys(values).map((key) => [key, []]));
}

/**
 * Summarizes a multiple choice in one short line: the first choice plus how many more.
 * @param labels Labels of the chosen options, in list order.
 * @param allLabel Label shown when nothing is chosen, e.g. "Todas".
 * @returns E.g. "Freios +2", "Freios", or the all label.
 */
export function selectionSummary(labels: readonly string[], allLabel: string): string {
  if (labels.length === 0) {
    return allLabel;
  }
  return labels.length === 1 ? labels[0] : `${labels[0]} +${labels.length - 1}`;
}

/**
 * Toggles a chip in a single-choice group: turning one on turns the others off, and the chip that is
 * already on turns off, leaving none selected.
 * @param selected Value of the chip that is on, or null.
 * @param value Value of the chip pressed.
 * @returns The value now on, or null.
 */
export function toggleExclusive(selected: string | null, value: string): string | null {
  return selected === value ? null : value;
}

/**
 * Toggles a value in a multiple choice, keeping the order the options are listed in.
 * @param chosen Values chosen so far.
 * @param value Value picked.
 * @param order Every option value, in list order.
 * @returns The chosen values with the picked one added or removed.
 */
export function toggleValue(chosen: readonly string[], value: string, order: readonly string[]): string[] {
  const next = chosen.includes(value) ? chosen.filter((v) => v !== value) : [...chosen, value];
  return order.filter((v) => next.includes(v));
}
