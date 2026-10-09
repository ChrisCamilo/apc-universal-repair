import { DISPLAY_LABEL } from '../styles/shared.ts'
import { recipe, tv } from '../styles/tv.ts'

// The look of the tree: rows in the display face at the top level, the body face in between and the mono face for the
// leaves; the selected or highlighted row on the soft accent with an accent bar on its left; a guide hanging under each
// open branch; and a soft hairline above every top-level row but the first, the same as Divider. A branch's children
// open by growing the one grid row they sit in from nothing to their full height: they show at once when it opens, so
// the keyboard can move into them straight away, and hide only once it has closed. The two boxes that open them only
// animate the list, so they add no level to its id, which is the same as on mobile.

/** The tree: the list, an item, its row with chevron, label and detail, and the group of its children. */
export const treeView = recipe(
  'common.tree-view',
  tv({
    slots: {
      base: 'min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain p-1',
      item: 'outline-none [&:focus-visible>[data-row]]:shadow-ring',
      row: 'relative flex min-w-0 items-center gap-2 overflow-hidden rounded-tile px-2 py-1 text-sm transition-[color,background-color,box-shadow]',
      chevron: 'shrink-0 text-text-muted transition-transform motion-reduce:transition-none',
      spacer: 'w-3 shrink-0',
      label: 'min-w-0 truncate',
      detail: 'shrink-0 font-mono text-xs font-normal text-text-muted',
      group: 'grid motion-reduce:transition-none',
      // The box that cuts the children off while they open reaches a little past them, so the focus ring of a row
      // inside isn't cut off too.
      clip: '-m-1 min-h-0 overflow-hidden p-1',
      // The guide hangs under the chevron's center: the row's padding plus half the chevron.
      list: 'ml-3.5 border-l border-hairline-soft pl-2',
    },
    variants: {
      separated: { true: { item: "before:mx-1 before:my-2 before:block before:h-px before:bg-hairline-soft before:content-['']" } },
      face: { display: { row: DISPLAY_LABEL }, body: {}, mono: { row: 'font-mono' } },
      active: {
        true: {
          row: [
            'bg-accent-soft font-medium text-accent shadow-glow',
            "before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent before:content-['']",
          ],
        },
        false: { row: 'text-text hover:bg-panel-raised' },
      },
      clickable: { true: { row: 'cursor-pointer' }, false: { row: 'cursor-default' } },
      open: {
        true: { chevron: 'rotate-90', group: 'visible grid-rows-[1fr] transition-[grid-template-rows]' },
        false: { group: 'invisible grid-rows-[0fr] transition-[grid-template-rows,visibility]' },
      },
    },
    defaultVariants: { separated: false, face: 'body', active: false, clickable: false, open: false },
  }),
  {
    base: '',
    item: 'item',
    row: 'item.row',
    chevron: 'item.row.chevron',
    spacer: 'item.row.spacer',
    label: 'item.row.label',
    detail: 'item.row.detail',
    group: 'item.open',
    clip: 'item.clip',
    list: 'item.group',
  },
)
