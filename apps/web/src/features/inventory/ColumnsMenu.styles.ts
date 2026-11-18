import { DISPLAY_LABEL } from '../../styles/shared.ts'
import { recipe, tv } from '../../styles/tv.ts'

// The look of the "Colunas" menu's trigger: its icon and name in the display face, as the Filtros trigger beside it,
// inside the Menu's own pill, which lights up in the accent on hover and while open. The menu's header, switches and
// "Restaurar padrão" keep the Menu's look and ids.

/** The trigger's content: the icon and the name. */
export const columnsMenu = recipe(
  'inventory.columns-menu',
  tv({ slots: { base: `inline-flex items-center gap-2 py-1 pl-2.5 text-xs ${DISPLAY_LABEL}` } }),
  { base: '' },
)
