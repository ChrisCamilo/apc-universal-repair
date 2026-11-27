import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { SessionUser } from '@apc/domain/auth';
import { isLocale, LOCALE_MESSAGES, LOCALE_NAMES, LOCALES, perLocale } from '@apc/domain/locale';
import { playIcon } from '@apc/tokens/icons';
import { isStyle, STYLES } from '@apc/tokens/theme';
import { BottomSheet } from '../../components/BottomSheet';
import { MenuHeader, MenuItem, MenuLabel } from '../../components/Menu';
import { MenuContext } from '../../components/Menu';
import { Divider } from '../../components/Panel';
import { Segmented } from '../../components/Segmented';
import { Switch } from '../../components/Switch';
import { useLocale, useMessages } from '../../app/locale';
import { useTheme } from '../../app/theme';
import { BottomBarItem } from './BottomBarItem';
import { useBarStyles } from './Dashboard.styles';
import { useStyles } from './UserMenu.styles';
import { useToast } from '../../components/Toast';
import { hasScreenLock, loadQueue, openLockSettings } from '../sync/inventoryCopy';
import { TutorialsDialog } from './TutorialsDialog';
import { useTutorials } from './tutorialsContext';
import { lastSync, syncBadge, syncOutcome } from '../sync/syncStatus';
import { useInventoryCopy } from '../sync/useInventoryCopy';
import { useTabReorder } from './tabReorderContext';
import { DASHBOARD_TEXTS } from '@apc/domain/app-texts';
import { PHONE_TEXTS } from '../../app/phoneTexts';

// The user menu, the same as the web's on a phone: Conta at the end of the Dashboard's bottom bar, the logged user's
// initials in its pill, opening the display preferences in a bottom sheet, as a menu. Dark mode and the theme go through the
// ThemeProvider, which applies and saves them at once, and "Idioma" (Português · English) through the LocaleProvider the
// same way; "Arrastar para reordenar" goes through the Dashboard (TabReorderContext), which saves it and makes the tabs
// reorderable while it is on. There is no "Itens por página", as the Inventory loads more as it scrolls. Every choice keeps the menu open, so several can be changed in a row; an
// action closes the sheet. "Tutorial do estoque", with a play icon, goes to the Inventory tab and runs its tutorial again.
// "Sincronizar agora", under when the phone's copy last caught up with the server and what waits, syncs it, and a toast
// says how it went, or why it failed: the server out of reach, or the phone without the local network access (see
// syncStatus.ts). "Conectar ao servidor" opens the pairing with the home server, to pair again, as after the computer's
// address changes. On a phone with no screen lock, "Definir bloqueio de tela" says one would protect the inventory kept
// on it (see AppLock.tsx) and opens Android's settings to set it.
// "Sair", at the end and set apart from the preferences, hands the logout to the owner, which ends the session and
// goes back to the login; the preferences stay on the device for the next login.

const LOCALE_OPTIONS = LOCALES.map((value) => ({ value, label: LOCALE_NAMES[value] }));
/** What the menu says on a phone with no screen lock. */
const STYLE_OPTIONS = perLocale((locale) => STYLES.map((style) => ({ value: style, label: DASHBOARD_TEXTS[locale].styles[style] })));

type UserMenuProps = {
  user: SessionUser;
  /** Ends the session and goes back to the login. */
  onLogout: () => void;
  /** Opens Conectar ao servidor, to pair with the server again. */
  onConnect: () => void;
};

export function UserMenu({ user, onLogout, onConnect }: UserMenuProps) {
  const { style, mode, setStyle, setMode } = useTheme();
  const { locale, setLocale } = useLocale();
  const messages = useMessages(LOCALE_MESSAGES);
  const texts = DASHBOARD_TEXTS[locale];
  const phone = PHONE_TEXTS[locale].userMenu;
  const { reorderable, setReorderable } = useTabReorder();
  const tutorials = useTutorials();
  const copy = useInventoryCopy();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [guides, setGuides] = useState(false);
  // Whether the phone has a screen lock, read each time the menu opens, as it may have been set meanwhile.
  const [locked, setLocked] = useState(true);
  const bar = useBarStyles();

  useEffect(() => {
    if (open) {
      hasScreenLock().then(setLocked, () => setLocked(true));
    }
  }, [open]);
  const { styles, ids } = useStyles();

  /** Syncs the copy now, and says how it went. */
  const syncNow = async () => {
    const result = await copy.sync();
    const waiting = (await loadQueue()).filter((operation) => !operation.sent).length;
    const { ok, message } = syncOutcome(result, waiting, locale);
    if (ok) {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  return (
    <>
      <BottomBarItem label={texts.account} expanded={open} onPress={() => setOpen(true)}>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={bar.styles.initials} testID={bar.ids.initials}>
          <Text style={bar.styles.initialsText} testID={bar.ids.initialsText}>
            {user.initials}
          </Text>
        </View>
      </BottomBarItem>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={texts.account}>
        <View accessibilityRole="menu" accessibilityLabel={texts.userMenu} style={styles.menu} testID={ids.menu}>
          <MenuContext.Provider value={{ close: () => setOpen(false) }}>
            <MenuHeader title={user.username} subtitle={user.displayName} />
            <MenuLabel>{texts.appearance}</MenuLabel>
            <Switch checked={mode === 'night'} onCheckedChange={(dark) => setMode(dark ? 'night' : 'day')}>
              {texts.darkMode}
            </Switch>
            <Segmented label={texts.style} options={STYLE_OPTIONS[locale]} value={style} onValueChange={(next) => isStyle(next) && setStyle(next)} />
            <Segmented label={messages.language} options={LOCALE_OPTIONS} value={locale} onValueChange={(next) => isLocale(next) && setLocale(next)} />
            <MenuLabel>{texts.tabsTitle}</MenuLabel>
            <Switch
              checked={reorderable}
              onCheckedChange={setReorderable}
              description={texts.reorderHint}
            >
              {texts.reorder}
            </Switch>
            <MenuLabel>{texts.inventory}</MenuLabel>
            <MenuItem icon={playIcon} onSelect={() => setGuides(true)}>
              {texts.tutorials}
            </MenuItem>
            <MenuLabel>{phone.sync}</MenuLabel>
            <MenuItem description={[lastSync(copy.syncedAt, locale), syncBadge(copy, locale)].filter(Boolean).join(' · ')} onSelect={syncNow}>
              {phone.syncNow}
            </MenuItem>
            {!locked && (
              <>
                <MenuLabel>{phone.security}</MenuLabel>
                <MenuItem description={phone.noLock} onSelect={openLockSettings}>
                  {phone.setLock}
                </MenuItem>
              </>
            )}
            <MenuLabel>{texts.server}</MenuLabel>
            <MenuItem onSelect={onConnect}>{phone.connect}</MenuItem>
            <Divider />
            <MenuItem onSelect={onLogout}>{texts.logOut}</MenuItem>
          </MenuContext.Provider>
        </View>
      </BottomSheet>
      <TutorialsDialog
        open={guides}
        onClose={() => setGuides(false)}
        onStart={(id) => {
          setGuides(false);
          tutorials.start(id);
        }}
      />
    </>
  );
}
