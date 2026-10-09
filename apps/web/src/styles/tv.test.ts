import { expect, test } from 'vitest'
import { recipe, tv } from './tv.ts'

// A recipe like a dialog's: the component's own element, a header with the title and the × inside, and a variant
// for a dialog that can be closed with the ×.
const dialog = recipe(
  'common.dialog',
  tv({
    slots: { base: 'rounded-panel bg-panel', header: 'flex gap-3', title: 'font-display', close: 'rounded-pill' },
    variants: { closable: { true: { header: 'justify-between' }, false: { close: 'hidden' } } },
    defaultVariants: { closable: false },
  }),
  { base: '', header: 'header', title: 'header.title', close: 'header.close' },
)

// Sets the same token property twice through the app's tv, the recipe's class first and the caller's after, and
// checks only the caller's stays: radius, shadow, font family, tracking, blur, color and font size. A font size
// and a text color are different properties, so both stay.
test('Web: the token classes merge, the last one winning', () => {
  const merged = (base: string, extra: string) => tv({ base })({ class: extra })
  expect(merged('rounded-panel', 'rounded-tile')).toBe('rounded-tile')
  expect(merged('rounded-tile', 'rounded-pill')).toBe('rounded-pill')
  expect(merged('shadow-ring', 'shadow-glow')).toBe('shadow-glow')
  expect(merged('shadow-pop', 'shadow-ring')).toBe('shadow-ring')
  expect(merged('font-body', 'font-display')).toBe('font-display')
  expect(merged('tracking-display', 'tracking-normal')).toBe('tracking-normal')
  expect(merged('backdrop-blur-backdrop', 'backdrop-blur-none')).toBe('backdrop-blur-none')
  expect(merged('bg-panel', 'bg-canvas')).toBe('bg-canvas')
  expect(merged('text-text', 'text-accent')).toBe('text-accent')
  expect(merged('text-sm', 'text-accent')).toBe('text-sm text-accent')
})

// Builds the dialog's slots and checks each gives its classes for the variant asked and its style id, the
// component's own element the component's id and each slot its path below it; a caller's class merges in.
test("Web: a recipe's slots give their classes and their style ids", () => {
  const closable = dialog({ closable: true })
  expect(closable.base()).toEqual({ className: 'rounded-panel bg-panel', 'data-testid': 'common.dialog' })
  expect(closable.header()).toEqual({ className: 'flex gap-3 justify-between', 'data-testid': 'common.dialog.header' })
  expect(closable.title({ class: 'font-body' })).toEqual({ className: 'font-body', 'data-testid': 'common.dialog.header.title' })
  expect(closable.close()).toEqual({ className: 'rounded-pill', 'data-testid': 'common.dialog.header.close' })
  expect(dialog().close().className).toBe('rounded-pill hidden')
})
