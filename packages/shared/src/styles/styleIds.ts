// Style ids: every styled element carries one, naming the area of the product it belongs to, its component and its
// place in that component, e.g. "common.dialog.header.close". The web puts it in data-testid and mobile in testID,
// the same string for the same element, so tests on both platforms find it alike. An id names a kind of element,
// not one instance: every row of a list shares it. The web's recipe() and mobile's createStyles() give the ids
// along with the styles, so a component never writes one by hand.

/**
 * The areas a style id starts with: `common` for the design system, what every area uses, and the others after the
 * epic that owns the component. A later epic adds its slug here when its first screen is built.
 */
export const STYLE_SCOPES = ["auth", "catalog", "common", "dashboard", "docs", "inventory"] as const;

/** A style id: a scope, then the component and the slots inside it, in kebab-case, a dot between levels. */
export type StyleId = `${StyleScope}.${string}`;
/** The area a style id starts with. */
export type StyleScope = (typeof STYLE_SCOPES)[number];

// A scope, a component and its slots: lowercase words and digits joined by hyphens, a dot between levels.
const STYLE_ID_PATTERN = new RegExp(`^(${STYLE_SCOPES.join("|")})(\\.[a-z0-9]+(-[a-z0-9]+)*)+$`);

/**
 * Checks a style id is written as the convention asks: a known scope, then kebab-case levels.
 * @param id The id to check, e.g. "common.dialog.header".
 * @returns Whether it is a well-formed style id.
 */
export function isStyleId(id: string): boolean {
  return STYLE_ID_PATTERN.test(id);
}

/**
 * Gives each slot of a component its style id: the component's id, then the slot's path inside it.
 * @param id The component's id, e.g. "common.dialog".
 * @param paths Each slot's path inside the component, e.g. { base: "", title: "header.title" }; "" is the component's
 * own element.
 * @returns Each slot's style id, e.g. { base: "common.dialog", title: "common.dialog.header.title" }.
 */
export function styleIds<Slot extends string>(id: StyleId, paths: Record<Slot, string>): Record<Slot, string> {
  const entries = Object.entries<string>(paths).map(([slot, path]) => [slot, path ? `${id}.${path}` : id]);
  return Object.fromEntries(entries) as Record<Slot, string>;
}
