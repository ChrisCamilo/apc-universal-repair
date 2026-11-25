import { recipe, tv } from '../../../styles/tv.ts'

// The look of the photo picker: the search on top, then the items found, each a framed line with its cover, name and
// code and a chevron in the accent that turns down while it is open, its photos under it in a grid of 4:3 tiles on the
// canvas; a checked photo takes the accent frame and a round check on the accent at its corner, glowing where the style
// has a glow, and one that no longer fits is faded. The count under the list turns to the warn color once the brand is
// full. On a phone the lines are 44px tall at least, and the photos go two to a row.

/** The picker: its body, the list of items, each item's line and photos, a photo's check, and the notes. */
export const photoPicker = recipe(
  'inventory.photo-picker',
  tv({
    slots: {
      base: 'grid gap-3',
      list: 'm-0 grid list-none gap-1.5 p-0',
      source: 'grid gap-2 rounded-tile border border-hairline-soft p-1.5',
      head: [
        'grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-tile p-1 text-left text-text',
        'outline-none transition-[background-color,box-shadow] hover:bg-panel-raised focus-visible:shadow-ring max-card:min-h-11',
      ],
      cover: 'size-11 rounded-tile border border-hairline-soft bg-canvas object-cover',
      text: 'grid min-w-0 gap-0.5',
      name: 'truncate text-sm',
      code: 'truncate font-mono text-xs text-text-muted',
      chevron: 'grid place-items-center text-accent transition-transform',
      photos: 'grid grid-cols-3 gap-2 px-1 pb-1 max-card:grid-cols-2',
      photo: [
        'relative aspect-4/3 cursor-pointer overflow-hidden rounded-tile border-2 border-hairline-soft bg-canvas p-0 outline-none',
        'transition-[border-color,box-shadow,opacity] focus-visible:shadow-ring aria-checked:border-accent',
        'disabled:cursor-not-allowed disabled:opacity-45',
      ],
      image: 'size-full object-cover',
      check: 'absolute top-1 right-1 grid size-6 place-items-center rounded-pill bg-accent text-on-accent shadow-glow',
      note: 'm-0 text-sm text-text-muted',
      count: 'm-0 font-mono text-xs text-text-muted',
    },
    variants: {
      // An item opened to its photos.
      open: { true: { chevron: 'rotate-90' } },
      // The brand has no room left.
      full: { true: { count: 'text-warn' } },
    },
  }),
  {
    base: '',
    list: 'list',
    source: 'list.source',
    head: 'list.source.head',
    cover: 'list.source.head.cover',
    text: 'list.source.head.text',
    name: 'list.source.head.text.name',
    code: 'list.source.head.text.code',
    chevron: 'list.source.head.chevron',
    photos: 'list.source.photos',
    photo: 'list.source.photos.photo',
    image: 'list.source.photos.photo.image',
    check: 'list.source.photos.photo.check',
    note: 'note',
    count: 'count',
  },
)
