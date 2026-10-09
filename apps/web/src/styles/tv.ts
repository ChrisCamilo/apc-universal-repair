import { createTV } from 'tailwind-variants'
import { styleIds, type StyleId } from '@apc/shared/style-ids'

// The style recipes of the web app: tv() builds a component's classes from its slots and variants, and recipe()
// gives each slot its style id too, so an element spreads both at once: <div {...ui.header()}>. A component's
// recipes live in its own *.styles.ts beside it; the ones three or more components share, in styles/shared.ts.

/** What a slot spreads on its element: its classes and its style id. */
export type StyledProps = { className: string; 'data-testid': string }

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
 * Turns a tv() recipe with slots into one whose slots give their style id along with their classes.
 * @param id The component's style id, e.g. "common.dialog".
 * @param styles The component's tv() recipe, with slots; `base` is the component's own element.
 * @param paths Each slot's path inside the component, e.g. { base: '', title: 'header.title' }.
 * @returns The recipe: called with the variants, it gives each slot a function returning its className and data-testid.
 */
export function recipe<Props, Slots extends Record<string, (slotProps?: never) => string>>(
  id: StyleId,
  styles: (props?: Props) => Slots,
  paths: Record<keyof Slots & string, string>,
): (props?: Props) => { [Slot in keyof Slots]: (slotProps?: Parameters<Slots[Slot]>[0]) => StyledProps } {
  const ids = styleIds(id, paths)
  return (props) => {
    const slots = styles(props)
    const styled = Object.keys(paths).map((slot) => [
      slot,
      (slotProps?: never) => ({ className: slots[slot](slotProps), 'data-testid': ids[slot] }),
    ])
    return Object.fromEntries(styled)
  }
}
