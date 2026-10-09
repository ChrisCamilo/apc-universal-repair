import { DISPLAY_LABEL } from '../styles/shared.ts'
import { recipe, tv } from '../styles/tv.ts'

// The look of the brand tiles: the raised fill in a soft hairline frame, the brand's name in the muted display face;
// the chosen one (aria-checked) takes the accent on its frame and text over a tinted fill, glowing where the style
// has a glow. The group is a grid with a small gap, laid out by its owner.

/** The group of brand tiles, and each tile with its logo or its name. */
export const selectableTileGroup = recipe(
  'common.selectable-tile-group',
  tv({
    slots: {
      base: 'grid gap-2',
      tile: [
        `grid min-w-0 cursor-pointer place-items-center rounded-tile border border-hairline-soft bg-panel-raised px-2.5 py-3 text-sm ${DISPLAY_LABEL}`,
        'text-text-muted outline-none transition-[color,border-color,background-color,box-shadow] not-aria-checked:hover:border-hairline',
        'not-aria-checked:hover:text-text focus-visible:shadow-ring aria-checked:border-accent aria-checked:bg-accent-soft',
        'aria-checked:text-accent aria-checked:shadow-glow',
      ],
      logo: 'h-5 max-w-full object-contain',
      name: 'max-w-full truncate',
    },
  }),
  { base: '', tile: 'tile', logo: 'tile.logo', name: 'tile.name' },
)
