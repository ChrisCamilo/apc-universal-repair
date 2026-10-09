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

// Builds the dialog's slots and checks each gives its classes for the variant asked, a caller's class merging in, and
// its style id: the component's own element the component's id and each slot its path below it.
test("Web: a recipe gives its slots' classes and style ids", () => {
  const { classes, ids } = dialog({ closable: true })
  expect(classes.base()).toBe('rounded-panel bg-panel')
  expect(classes.header()).toBe('flex gap-3 justify-between')
  expect(classes.title({ class: 'font-body' })).toBe('font-body')
  expect(classes.close()).toBe('rounded-pill')
  expect(dialog().classes.close()).toBe('rounded-pill hidden')
  expect(ids).toEqual({
    base: 'common.dialog',
    header: 'common.dialog.header',
    title: 'common.dialog.header.title',
    close: 'common.dialog.header.close',
  })
})
