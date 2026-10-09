import { createTV } from 'tailwind-variants'
import { styleIds, type StyleId } from '@apc/shared/style-ids'

// The style recipes of the web app: tv() builds a component's classes from its slots and variants, and recipe() adds
// each slot's style id, so an element reads both from the same call, the same as on mobile:
// <div className={classes.header()} data-testid={ids.header}>. A component's recipes live in its own *.styles.ts
// beside it; the ones three or more components share, in styles/shared.ts.

/** What a recipe gives for a set of variants: each slot's classes, as a function, and each slot's style id. */
export type Styled<Slots> = { classes: Slots; ids: Record<keyof Slots & string, string> }

/**
 * tv() for this app: tailwind-merge learns the token classes index.css defines (rounded-tile, shadow-ring,
 * font-display…), so when a recipe and a caller both set one, the last one wins instead of both staying.
 */
export const tv = createTV({
  twMergeConfig: {
    extend: {
      theme: {
        blur: ['backdrop'],
        font: ['body', 'display', 'mono'],
        radius: ['panel', 'pill', 'tile'],
        shadow: ['glow', 'pop', 'ring'],
        tracking: ['display'],
      },
    },
  },
})

/**
 * Gives a tv() recipe with slots the style id of each slot, so a component reads both from one call.
 * @param id The component's style id, e.g. "common.dialog".
 * @param styles The component's tv() recipe, with slots; `base` is the component's own element.
 * @param paths Each slot's path inside the component, e.g. { base: '', title: 'header.title' }.
 * @returns The recipe: called with the variants, it gives each slot's classes and each slot's style id.
 */
export function recipe<Props, Slots extends Record<string, (slotProps?: never) => string>>(
  id: StyleId,
  styles: (props?: Props) => Slots,
  paths: Record<keyof Slots & string, string>,
): (props?: Props) => Styled<Slots> {
  const ids = styleIds(id, paths)
  return (props) => ({ classes: styles(props), ids })
}
