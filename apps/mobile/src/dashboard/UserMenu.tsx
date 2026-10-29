import { useState } from 'react';
import { Text, View } from 'react-native';
import type { SessionUser } from '@apc/shared/auth';
import { playIcon } from '@apc/shared/icons';
import { PAGE_SIZES } from '@apc/shared/pagination';
import { isStyle, STYLE_LABELS, STYLES } from '@apc/shared/theme';
import { BottomSheet } from '../BottomSheet';
import { MenuHeader, MenuItem, MenuLabel } from '../Menu';
import { MenuContext } from '../menuContext';
import { Divider } from '../Panel';
import { Segmented } from '../Segmented';
import { Switch } from '../Switch';
import { useTheme } from '../theme';
import { BottomBarItem } from './BottomBarItem';
import { useBarStyles } from './Dashboard.styles';
import { useStyles } from './UserMenu.styles';
import { useInventoryTutorial } from './inventoryTutorialContext';
import { usePageSize } from './pageSizeContext';
import { useTabReorder } from './tabReorderContext';

// The user menu, the same as the web's on a phone: Conta at the end of the Dashboard's bottom bar, the logged user's
// initials in its pill, opening the display preferences in a bottom sheet, as a menu. Dark mode and the theme go through the
// ThemeProvider, which applies and saves them at once; "Arrastar para reordenar" goes through the Dashboard
// (TabReorderContext), which saves it and makes the tabs reorderable while it is on; "Itens por página" sets how many
// items the Inventory list shows, now and each time it opens. Every choice keeps the menu open, so several can be
// changed in a row; an action closes the sheet. "Tutorial do estoque", with a play icon, goes to the Inventory tab and runs its tutorial again.
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
  const { pageSize, setPageSize } = usePageSize();
  const tutorial = useInventoryTutorial();
  const [open, setOpen] = useState(false);
  const bar = useBarStyles();
  const { styles, ids } = useStyles();

  return (
    <>
      <BottomBarItem label="Conta" expanded={open} onPress={() => setOpen(true)}>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={bar.styles.initials} testID={bar.ids.initials}>
          <Text style={bar.styles.initialsText} testID={bar.ids.initialsText}>
            {user.initials}
          </Text>
        </View>
      </BottomBarItem>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Conta">
        <View accessibilityRole="menu" accessibilityLabel="Menu do usuário" style={styles.menu} testID={ids.menu}>
          <MenuContext.Provider value={{ close: () => setOpen(false) }}>
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
            <MenuItem icon={playIcon} onSelect={tutorial.replay}>
              Tutorial do estoque
            </MenuItem>
            <Divider />
            <MenuItem onSelect={onLogout}>Sair</MenuItem>
          </MenuContext.Provider>
        </View>
      </BottomSheet>
    </>
  );
}
