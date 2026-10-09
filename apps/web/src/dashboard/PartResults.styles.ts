import { recipe, tv } from '../styles/tv.ts'

// The look of the parts a Catalog search by code found: a box in the soft accent, its parts clear at rest, the panel
// fill on hover, and the chosen one (aria-checked) with the accent frame on the panel fill.

/** The found parts: the box, the radio group and each part with its code, name and the vehicle it fits. */
export const partResults = recipe(
  'catalog.part-results',
  tv({
    slots: {
      base: 'grid gap-1 rounded-tile border border-accent/45 bg-accent-soft p-3',
      list: 'grid gap-1',
      part: [
        'grid w-full cursor-pointer gap-0.5 rounded-tile border border-transparent px-2 py-1.5 text-left text-sm text-text',
        'outline-none transition-[background-color,border-color,box-shadow] hover:bg-panel focus-visible:shadow-ring',
        'aria-checked:border-accent aria-checked:bg-panel',
      ],
      line: 'flex min-w-0 flex-wrap items-baseline gap-x-2.5',
      code: 'font-mono text-xs text-accent',
      name: 'min-w-0',
      fit: 'text-xs text-text-muted',
    },
  }),
  {
    base: '',
    list: 'list',
    part: 'list.part',
    line: 'list.part.line',
    code: 'list.part.line.code',
    name: 'list.part.line.name',
    fit: 'list.part.fit',
  },
)
