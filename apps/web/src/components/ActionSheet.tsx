import { ICON_SIZES, type IconShape } from '@apc/shared/icons'
import { actionSheet } from './ActionSheet.styles.ts'
import { BottomSheet } from './BottomSheet.tsx'
import { Icon } from './Icon.tsx'

// A phone's list of actions in a bottom sheet, such as the Inventory's "⋯" (the Mais ações mockup): a row per action,
// with its icon and its name. A press closes the sheet and runs the action, which may open a dialog of its own.

type Action = { icon: IconShape[]; label: string; onSelect: () => void }
type ActionSheetProps = {
  open: boolean
  /** Called on a press of an action, Escape, a click on the backdrop or a drag down; the owner closes the sheet. */
  onClose: () => void
  title: string
  actions: Action[]
}

export function ActionSheet({ open, onClose, title, actions }: ActionSheetProps) {
  const { classes, ids } = actionSheet()
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className={classes.base()} data-testid={ids.base}>
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={classes.action()}
            data-testid={ids.action}
            onClick={() => {
              onClose()
              action.onSelect()
            }}
          >
            <span aria-hidden="true" className={classes.icon()} data-testid={ids.icon}>
              <Icon icon={action.icon} size={ICON_SIZES.dropZone} />
            </span>
            {action.label}
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}
