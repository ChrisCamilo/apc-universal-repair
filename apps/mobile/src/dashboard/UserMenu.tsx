import type { SessionUser } from '@apc/shared/auth';
import { PAGE_SIZES } from '@apc/shared/pagination';
import { isStyle, STYLE_LABELS, STYLES } from '@apc/shared/theme';
import { Menu, MenuHeader, MenuItem, MenuLabel, UserBadge } from '../Menu';
import { Divider } from '../Panel';
import { Segmented } from '../Segmented';
import { Switch } from '../Switch';
import { useTheme } from '../theme';
import { useInventoryTutorial } from './inventoryTutorialContext';
import { useOpenItemOnRow } from './openItemOnRowContext';
import { usePageSize } from './pageSizeContext';
import { useTabReorder } from './tabReorderContext';

// The user menu at the right of the Dashboard header, the same as the web: the logged user's initials on the
// trigger (the username too on wide screens), and the display preferences. Dark mode and the theme go through the
// ThemeProvider, which applies and saves them at once; "Arrastar para reordenar" goes through the Dashboard
// (TabReorderContext), which saves it and makes the tabs reorderable while it is on, and "Abrir item ao clicar na
// linha" likewise makes the Inventory cards open the item details; "Itens por página" sets how many items the
// Inventory list shows, now and each time it opens. Every choice keeps the menu open, so several can
// be changed in a row. "Tutorial do estoque" goes to the Inventory tab and runs its tutorial again.
// "Sair", at the end and set apart from the preferences, hands the logout to the owner, which ends the session and
// goes back to the login; the preferences stay on the device for the next login.

const PAGE_SIZE_OPTIONS = PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }));
const STYLE_OPTIONS = STYLES.map((style) => ({ value: style, label: STYLE_LABELS[style] }));

type UserMenuProps = {
  user: SessionUser;
  /** Ends the session and goes back to the login. */
  onLogout: () => void;
};

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const { style, mode, setStyle, setMode } = useTheme();
  const { reorderable, setReorderable } = useTabReorder();
  const { opensOnRow, setOpensOnRow } = useOpenItemOnRow();
  const { pageSize, setPageSize } = usePageSize();
  const tutorial = useInventoryTutorial();

  return (
    <Menu label="Menu do usuário" trigger={<UserBadge initials={user.initials} name={user.username} />}>
      <MenuHeader title={user.username} subtitle={user.displayName} />
      <MenuLabel>Aparência</MenuLabel>
      <Switch checked={mode === 'night'} onCheckedChange={(dark) => setMode(dark ? 'night' : 'day')}>
        Modo escuro
      </Switch>
      <Segmented label="Tema" options={STYLE_OPTIONS} value={style} onValueChange={(next) => isStyle(next) && setStyle(next)} />
      <MenuLabel>Abas</MenuLabel>
      <Switch
        checked={reorderable}
        onCheckedChange={setReorderable}
        description="Troque a ordem pelo puxador ou com Alt + setas"
      >
        Arrastar para reordenar
      </Switch>
      <MenuLabel>Estoque</MenuLabel>
      <Segmented
        label="Itens por página"
        description="Padrão ao abrir o estoque"
        options={PAGE_SIZE_OPTIONS}
        value={String(pageSize)}
        onValueChange={(size) => setPageSize(Number(size))}
      />
      <Switch
        checked={opensOnRow}
        onCheckedChange={setOpensOnRow}
        description="Mostra os detalhes; editar fica a um toque"
      >
        Abrir item ao clicar na linha
      </Switch>
      <MenuItem onSelect={tutorial.replay}>Tutorial do estoque</MenuItem>
      <Divider />
      <MenuItem onSelect={onLogout}>Sair</MenuItem>
    </Menu>
  );
}
