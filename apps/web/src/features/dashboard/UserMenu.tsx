import { useState } from 'react'
import { useNavigate } from 'react-router'
import { RELEASE_NOTES, RELEASE_VERSION } from 'virtual:apc-release'
import { gearIcon, infoIcon, lockIcon, playIcon } from '@apc/tokens/icons'
import { PAGE_SIZES } from '@apc/domain/list-query'
import { COMPONENT_TEXTS, DASHBOARD_TEXTS } from '@apc/domain/app-texts'
import { isLocale, LOCALE_MESSAGES, LOCALE_NAMES, LOCALES, perLocale } from '@apc/domain/locale'
import { isStyle, STYLES } from '@apc/tokens/theme'
import { auth } from '../auth/auth.ts'
import { useSession } from '../auth/sessionContext.ts'
import { BottomSheet } from '../../components/BottomSheet'
import { Menu, MenuHeader, MenuItem, MenuLabel, UserBadge } from '../../components/Menu'
import { MenuContext } from '../../components/Menu'
import { Divider } from '../../components/Panel'
import { Segmented } from '../../components/Segmented'
import { Switch } from '../../components/Switch'
import { usePhone } from '../../components/usePhone.ts'
import { desktopBridge } from '../desktop/desktopBridge.ts'
import { DevicesDialog } from '../desktop/DevicesDialog.tsx'
import { useOpenServerSettings } from '../desktop/serverSettingsContext.ts'
import { useLocale, useMessages } from '../../app/useLocale.ts'
import { useTheme } from '../../app/useTheme.ts'
import { WEB_TEXTS } from '../../app/webTexts.ts'
import { AboutDialog } from './AboutDialog.tsx'
import { BottomBarItem } from './BottomBarItem.tsx'
import { bottomBar } from './DashboardLayout.styles.ts'
import { usePageSize } from './pageSizeContext.ts'
import { useTabReorder } from './tabReorderContext.ts'
import { TutorialsDialog } from './TutorialsDialog.tsx'
import { useTutorials } from './tutorialsContext.ts'

// The user menu at the right of the Dashboard header: the logged user's initials and username on the trigger
// (initials only on phones), and the display preferences. Dark mode and the theme go through the ThemeProvider,
// which applies and saves them at once, and "Idioma" (Português · English) through the LocaleProvider the same way;
// "Arrastar para reordenar" goes through the Dashboard (TabReorderContext), which saves it and makes the tabs reorderable
// while it is on; "Itens por página" sets how many items the Inventory
// list shows, now and each time it opens. Every choice keeps the menu open, so several can be changed in a row.
// "Tutoriais", with a play icon, opens the tutorials by feature, where pressing one goes to its tab and starts it (see
// TutorialsDialog.tsx). In the desktop app, "Servidor e banco de
// dados", with a gear, opens the Servidor dialog (see ServerSettings.tsx), and "Dispositivos", with a lock, the devices
// authorized to log in (see DevicesDialog.tsx); the web app's demo shows "Dispositivos" too, which says it isn't there.
// Set apart from the preferences, at the end: "Sobre esta versão", with an info icon, opens the version in use and its
// release notes (see AboutDialog.tsx), and "Sair" ends the session and goes back to /login; the preferences stay on the
// device for the next login.
// On a phone it is Conta in the Dashboard's bottom bar, the initials in its pill, and the same items open in a bottom
// sheet, as a menu, without "Itens por página", since the Inventory loads more as it scrolls there; an action closes
// it, as it closes the menu.

const LOCALE_OPTIONS = LOCALES.map((value) => ({ value, label: LOCALE_NAMES[value] }))
const PAGE_SIZE_OPTIONS = PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))
const STYLE_OPTIONS = perLocale((locale) => STYLES.map((style) => ({ value: style, label: DASHBOARD_TEXTS[locale].styles[style] })))

export function UserMenu() {
  const { user, setUser } = useSession()
  const navigate = useNavigate()
  const { style, mode, setStyle, setMode } = useTheme()
  const { locale, setLocale } = useLocale()
  const messages = useMessages(LOCALE_MESSAGES)
  const texts = DASHBOARD_TEXTS[locale]
  const { reorderable, setReorderable } = useTabReorder()
  const { pageSize, setPageSize } = usePageSize()
  const tutorials = useTutorials()
  const openServerSettings = useOpenServerSettings()
  const [about, setAbout] = useState(false)
  const [guides, setGuides] = useState(false)
  const [devices, setDevices] = useState(false)
  const [sheet, setSheet] = useState(false)
  const phone = usePhone()
  const bar = bottomBar()
  // Nobody to show for a moment after "Sair", until the app leaves the Dashboard.
  if (!user) {
    return null
  }
  const items = (
    <>
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
      {/* A phone's list loads more as it scrolls, with no pages. */}
      {!phone && (
        <Segmented
          label={COMPONENT_TEXTS[locale].pagination.pageSize}
          description={texts.pageSizeHint}
          options={PAGE_SIZE_OPTIONS}
          value={String(pageSize)}
          onValueChange={(size) => setPageSize(Number(size))}
        />
      )}
      <MenuItem icon={playIcon} onSelect={() => setGuides(true)}>
        {texts.tutorials}
      </MenuItem>
      {(desktopBridge()?.server || import.meta.env.VITE_DEMO) && (
        <>
          <MenuLabel>{texts.server}</MenuLabel>
          {desktopBridge()?.server && (
            <MenuItem icon={gearIcon} onSelect={openServerSettings}>
              {texts.serverSettings}
            </MenuItem>
          )}
          <MenuItem icon={lockIcon} onSelect={() => setDevices(true)}>
            {texts.devices}
          </MenuItem>
        </>
      )}
      <Divider />
      <MenuItem icon={infoIcon} onSelect={() => setAbout(true)}>
        {WEB_TEXTS[locale].about.title}
      </MenuItem>
      <MenuItem
        onSelect={async () => {
          await auth.logout()
          setUser(null)
          navigate('/login', { replace: true })
        }}
      >
        {texts.logOut}
      </MenuItem>
    </>
  )
  return (
    <>
      {phone ? (
        <>
          <BottomBarItem label={texts.account} expanded={sheet} onClick={() => setSheet(true)}>
            <span aria-hidden="true" className={bar.classes.initials()} data-testid={bar.ids.initials}>
              {user.initials}
            </span>
          </BottomBarItem>
          <BottomSheet open={sheet} onClose={() => setSheet(false)} title={texts.account}>
            <div role="menu" aria-label={texts.userMenu}>
              <MenuContext.Provider value={{ close: () => setSheet(false) }}>{items}</MenuContext.Provider>
            </div>
          </BottomSheet>
        </>
      ) : (
        <Menu label={texts.userMenu} trigger={<UserBadge initials={user.initials} name={user.username} />}>
          {items}
        </Menu>
      )}
      <TutorialsDialog
        open={guides}
        onClose={() => setGuides(false)}
        onStart={(id) => {
          setGuides(false)
          tutorials.start(id)
        }}
      />
      <AboutDialog open={about} onClose={() => setAbout(false)} version={RELEASE_VERSION} notes={RELEASE_NOTES} />
      <DevicesDialog open={devices} onClose={() => setDevices(false)} />
    </>
  )
}
