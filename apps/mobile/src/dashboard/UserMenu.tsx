import type { SessionUser } from '@apc/shared/auth';
import { isStyle, STYLE_LABELS, STYLES } from '@apc/shared/theme';
import { Menu, MenuHeader, MenuItem, MenuLabel, UserBadge } from '../Menu';
import { Divider } from '../Panel';
import { Segmented } from '../Segmented';
import { Switch } from '../Switch';
import { useTheme } from '../theme';
import { useTabReorder } from './tabReorderContext';

// The user menu at the right of the Dashboard header, the same as the web: the logged user's initials on the
// trigger (the username too on wide screens), and the display preferences. Dark mode and the theme go through the
// ThemeProvider, which applies and saves them at once; "Arrastar para reordenar" goes through the Dashboard
// (TabReorderContext), which saves it and makes the tabs reorderable while it is on. Every choice keeps the menu open, so several can be changed in a row.
// "Sair", at the end and set apart from the preferences, hands the logout to the owner, which ends the session and
// goes back to the login; the preferences stay on the device for the next login.

const STYLE_OPTIONS = STYLES.map((style) => ({ value: style, label: STYLE_LABELS[style] }));

type UserMenuProps = {
  user: SessionUser;
  /** Ends the session and goes back to the login. */
  onLogout: () => void;
};

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const { style, mode, setStyle, setMode } = useTheme();
  const { reorderable, setReorderable } = useTabReorder();

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
      <Divider />
      <MenuItem onSelect={onLogout}>Sair</MenuItem>
    </Menu>
  );
}
