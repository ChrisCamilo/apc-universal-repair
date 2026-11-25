import { ICON_SIZES, listIcon } from '@apc/tokens/icons'
import { ITEM_HIDDEN_COLUMNS_DEFAULT, ITEM_TABLE_COLUMNS } from '@apc/domain/item-filters'
import type { ItemSortKey } from '@apc/domain/items'
import { Icon } from '../../../components/Icon'
import { Menu, MenuItem } from '../../../components/Menu'
import { Switch } from '../../../components/Switch'
import { columnsMenu } from './ColumnsMenu.styles.ts'
import { useLocale } from '../../../app/useLocale.ts'

// The Inventory toolbar's "Colunas" menu, on the desktop: a switch for each of the table's columns after the item's
// name, on while it shows, which keeps the menu open, and "Restaurar padrão", which brings the default columns back
// (every one but Local) and closes it. The item's name always shows. The menu has no header, so it fits under the
// toolbar at the smallest desktop height (1360×689). The owner keeps the choice (see useHiddenColumns).

type ColumnsMenuProps = {
  /** The keys of the columns the table hides. */
  hidden: readonly ItemSortKey[]
  onHiddenChange: (hidden: ItemSortKey[]) => void
}

export function ColumnsMenu({ hidden, onHiddenChange }: ColumnsMenuProps) {
  const { locale } = useLocale()
  const { classes, ids } = columnsMenu()

  /** Shows or hides a column, keeping the others as they are. */
  const toggle = (key: ItemSortKey, shown: boolean) =>
    onHiddenChange(ITEM_TABLE_COLUMNS[locale].map((column) => column.key).filter((each) => (each === key ? !shown : hidden.includes(each))))

  return (
    <Menu
      label="Colunas da tabela"
      align="start"
      trigger={
        <span className={classes.base()} data-testid={ids.base}>
          <Icon icon={listIcon} size={ICON_SIZES.compact} />
          Colunas
        </span>
      }
    >
      {ITEM_TABLE_COLUMNS[locale].map((column) => (
        <Switch key={column.key} checked={!hidden.includes(column.key)} onCheckedChange={(shown) => toggle(column.key, shown)}>
          {column.label}
        </Switch>
      ))}
      <MenuItem onSelect={() => onHiddenChange([...ITEM_HIDDEN_COLUMNS_DEFAULT])}>Restaurar padrão</MenuItem>
    </Menu>
  )
}
