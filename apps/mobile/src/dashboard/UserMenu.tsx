import { useEffect, useState } from 'react';
import type { SessionUser } from '@apc/shared/auth';
import { REORDER_TABS_STORAGE_KEY } from '@apc/shared/tabs';
import { isStyle, STYLE_LABELS, STYLES } from '@apc/shared/theme';
import { Menu, MenuHeader, MenuItem, MenuLabel, UserBadge } from '../Menu';
import { Divider } from '../Panel';
import { Segmented } from '../Segmented';
import { Switch } from '../Switch';
import { save, themeStorage, useTheme } from '../theme';

// The user menu at the right of the Dashboard header, the same as the web: the logged user's initials on the
// trigger (the username too on wide screens), and the display preferences. Dark mode and the theme go through the
// ThemeProvider, which applies and saves them at once; "Arrastar para reordenar" is saved on the device, off until
// turned on, and the tabs follow it (#42). Every choice keeps the menu open, so several can be changed in a row.
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
  const [reorder, setReorder] = useState(false);

  // Read the saved reorder choice.
  useEffect(() => {
    let live = true;
    themeStorage
      .getItem(REORDER_TABS_STORAGE_KEY)
      .then((saved) => live && setReorder(saved === 'true'))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

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
        checked={reorder}
        onCheckedChange={(on) => {
          setReorder(on);
          save(REORDER_TABS_STORAGE_KEY, String(on));
        }}
        description="Troque a ordem pelo puxador ou com Alt + setas"
      >
        Arrastar para reordenar
      </Switch>
      <Divider />
      <MenuItem onSelect={onLogout}>Sair</MenuItem>
    </Menu>
  );
}
