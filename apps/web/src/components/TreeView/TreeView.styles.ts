import { DISPLAY_LABEL } from '../../styles/shared.ts'
import { recipe, tv } from '../../styles/tv.ts'

// The look of the tree: rows in the display face at the top level, the body face in between and the mono face for the
// leaves; the selected or highlighted row on the soft accent with an accent bar on its left; a guide hanging under each
// open branch; and a soft hairline above every top-level row but the first, the same as Divider. A branch's children
// open by growing the one grid row they sit in from nothing to their full height: they show at once when it opens, so
// the keyboard can move into them straight away, and hide only once it has closed. The two boxes that open them only
// animate the list, so they add no level to its id, which is the same as on mobile.
// On a phone (below `card:`) a row is 48px tall in the body size, and each level is indented 16px with no guide. A
// leaf's tag is a pill in the display face, outlined at rest and filled in the accent on the selected leaf. The chevron
// of a branch that can be selected, which opens it apart from the row, is a finger wide, reaching past it on each side
// so it and the label stay where they were.
// A row's own buttons sit at its right end, hidden until the row is pointed at, or shown on the row the keyboard is on
// while the focus is in the tree (a state the tree keeps, as a focus rule would hide them while the focus moves from
// the row into them), and always in view on a phone, which has no pointer to hover with; a row shown as something else, such as a field, takes the row's whole width; and the line after a branch's
// children sits under them, on the guide.

/** The tree: the list, an item, its row with chevron, label, detail and tag, and the group of its children. */
export const treeView = recipe(
  'common.tree-view',
  tv({
    slots: {
      base: 'min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain p-1',
      item: 'outline-none [&:focus-visible>[data-row]]:shadow-ring [&>[data-row]:hover_[data-actions]]:flex',
      row: [
        'relative flex min-w-0 items-center gap-2 overflow-hidden rounded-tile px-2 py-1 text-sm transition-[color,background-color,box-shadow]',
        'max-card:min-h-12 max-card:text-base',
      ],
      chevron: 'shrink-0 text-text-muted transition-transform motion-reduce:transition-none',
      toggle: 'grid shrink-0 place-items-center max-card:-mx-4 max-card:-my-2 max-card:size-11',
      spacer: 'w-3 shrink-0',
      label: 'min-w-0 truncate',
      detail: 'shrink-0 font-mono text-xs font-normal text-text-muted',
      tag: `ml-auto shrink-0 rounded-pill border px-2.5 py-1 text-[11px]/none ${DISPLAY_LABEL}`,
      actions: '-my-1 ml-auto hidden shrink-0 items-center max-card:flex gap-0.5 font-body font-normal normal-case tracking-normal',
      editing: 'min-w-0 flex-1 cursor-default font-body font-normal normal-case tracking-normal',
      after: 'py-1',
      group: 'grid motion-reduce:transition-none',
      // The box that cuts the children off while they open reaches a little past them, so the focus ring of a row
      // inside isn't cut off too.
      clip: '-m-1 min-h-0 overflow-hidden p-1',
      // The guide hangs under the chevron's center: the row's padding plus half the chevron.
      list: 'ml-3.5 border-l border-hairline-soft pl-2 max-card:ml-0 max-card:border-l-0 max-card:pl-4',
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
          tag: 'border-accent bg-accent text-on-accent',
        },
        false: { row: 'text-text hover:bg-panel-raised', tag: 'border-hairline text-text' },
      },
      clickable: { true: { row: 'cursor-pointer' }, false: { row: 'cursor-default' } },
      actionsShown: { true: { actions: 'flex' } },
      open: {
        true: { chevron: 'rotate-90', group: 'visible grid-rows-[1fr] transition-[grid-template-rows]' },
        false: { group: 'invisible grid-rows-[0fr] transition-[grid-template-rows,visibility]' },
      },
    },
    defaultVariants: { separated: false, face: 'body', active: false, clickable: false, actionsShown: false, open: false },
  }),
  {
    base: '',
    item: 'item',
    row: 'item.row',
    chevron: 'item.row.chevron',
    toggle: 'item.row.toggle',
    spacer: 'item.row.spacer',
    label: 'item.row.label',
    detail: 'item.row.detail',
    tag: 'item.row.tag',
    actions: 'item.row.actions',
    editing: 'item.row.editing',
    after: 'item.group.after',
    group: 'item.open',
    clip: 'item.clip',
    list: 'item.group',
  },
)
