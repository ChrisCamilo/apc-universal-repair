import { recipe, tv } from '../styles/tv.ts'

// The look of the photo field: the photos as square tiles, the first one marked as the cover, each with a remove ×
// on a dark chip that turns to the danger color on hover; the dashed drop area that lights up in the accent on hover
// and while a file is dragged over it; and the problems in the danger color.

// A small chip over a photo: the cover mark and the remove ×.
const CHIP = 'absolute rounded-pill bg-backdrop text-text'

/** The photo field: the group, the photo tiles with their cover mark and remove ×, the drop area and the problems. */
export const imageUpload = recipe(
  'common.image-upload',
  tv({
    slots: {
      base: 'grid gap-1.5',
      photos: 'm-0 flex list-none flex-wrap gap-2 p-0',
      photo: 'relative size-18 max-w-full overflow-hidden rounded-tile border border-hairline-soft bg-panel-raised',
      image: 'size-full object-cover',
      cover: `${CHIP} bottom-1 left-1 px-1.5 font-mono text-xs leading-normal`,
      remove: `${CHIP} top-1 right-1 grid size-5.5 cursor-pointer place-items-center outline-none transition-colors hover:bg-danger hover:text-on-danger focus-visible:shadow-ring`,
      drop: [
        'grid cursor-pointer grid-cols-[calc(var(--spacing)*18)_minmax(0,1fr)] items-center gap-3 rounded-tile border border-dashed',
        'border-hairline bg-panel-raised p-3 font-body text-sm text-text transition-colors hover:border-accent hover:bg-accent-soft',
        'has-[input:focus-visible]:shadow-ring data-dragging:border-accent data-dragging:bg-accent-soft',
      ],
      picture: 'grid size-18 place-items-center rounded-tile border border-hairline-soft bg-panel text-text-muted',
      text: 'grid gap-0.5',
      hint: 'text-xs text-text-muted',
      input: 'sr-only',
      problems: 'm-0 grid list-none gap-0.5 p-0 font-body text-sm text-danger',
    },
  }),
  {
    base: '',
    photos: 'photos',
    photo: 'photos.photo',
    image: 'photos.photo.image',
    cover: 'photos.photo.cover',
    remove: 'photos.photo.remove',
    drop: 'drop',
    picture: 'drop.picture',
    text: 'drop.text',
    hint: 'drop.text.hint',
    input: 'drop.input',
    problems: 'problems',
  },
)
