import { useState } from 'react'
import { useNavigate } from 'react-router'
import { RELEASE_NOTES, RELEASE_VERSION } from 'virtual:apc-release'
import { gearIcon, infoIcon, playIcon } from '@apc/shared/icons'
import { PAGE_SIZES } from '@apc/shared/pagination'
import { isStyle, STYLE_LABELS, STYLES } from '@apc/shared/theme'
import { auth } from '../auth/auth.ts'
import { useSession } from '../auth/sessionContext.ts'
import { BottomSheet } from '../components/BottomSheet.tsx'
import { Menu, MenuHeader, MenuItem, MenuLabel, UserBadge } from '../components/Menu.tsx'
import { MenuContext } from '../components/menuContext.ts'
import { Divider } from '../components/Panel.tsx'
import { Segmented } from '../components/Segmented.tsx'
import { Switch } from '../components/Switch.tsx'
import { usePhone } from '../components/usePhone.ts'
import { desktopBridge } from '../desktop/desktopBridge.ts'
import { useOpenServerSettings } from '../desktop/serverSettingsContext.ts'
import { useTheme } from '../useTheme.ts'
import { AboutDialog } from './AboutDialog.tsx'
import { BottomBarItem } from './BottomBarItem.tsx'
import { bottomBar } from './DashboardLayout.styles.ts'
import { useInventoryTutorial } from './inventoryTutorialContext.ts'
import { usePageSize } from './pageSizeContext.ts'
import { useTabReorder } from './tabReorderContext.ts'

// The user menu at the right of the Dashboard header: the logged user's initials and username on the trigger
// (initials only on phones), and the display preferences. Dark mode and the theme go through the ThemeProvider,
// which applies and saves them at once; "Arrastar para reordenar" goes through the Dashboard (TabReorderContext),
// which saves it and makes the tabs reorderable while it is on; "Itens por página" sets how many items the Inventory
// list shows, now and each time it opens. Every choice keeps the menu open, so several can be changed in a row. "Tutorial do estoque",
// with a play icon, goes to the Inventory tab and runs its tutorial again. In the desktop app, "Servidor e banco de
// dados", with a gear, opens the Servidor dialog (see ServerSettings.tsx).
// Set apart from the preferences, at the end: "Sobre esta versão", with an info icon, opens the version in use and its
// release notes (see AboutDialog.tsx), and "Sair" ends the session and goes back to /login; the preferences stay on the
// device for the next login.
// On a phone it is Conta in the Dashboard's bottom bar, the initials in its pill, and the same items open in a bottom
// sheet, as a menu; an action closes it, as it closes the menu.

const PAGE_SIZE_OPTIONS = PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))
const STYLE_OPTIONS = STYLES.map((style) => ({ value: style, label: STYLE_LABELS[style] }))

export function UserMenu() {
  const { user, setUser } = useSession()
  const navigate = useNavigate()
  const { style, mode, setStyle, setMode } = useTheme()
  const { reorderable, setReorderable } = useTabReorder()
  const { pageSize, setPageSize } = usePageSize()
  const tutorial = useInventoryTutorial()
  const openServerSettings = useOpenServerSettings()
  const [about, setAbout] = useState(false)
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
      <MenuItem
        icon={playIcon}
        onSelect={() => {
          navigate('/inventory')
          tutorial.replay()
        }}
      >
        Tutorial do estoque
      </MenuItem>
      {desktopBridge()?.server && (
        <>
          <MenuLabel>Servidor</MenuLabel>
          <MenuItem icon={gearIcon} onSelect={openServerSettings}>
            Servidor e banco de dados
          </MenuItem>
        </>
      )}
      <Divider />
      <MenuItem icon={infoIcon} onSelect={() => setAbout(true)}>
        Sobre esta versão
      </MenuItem>
      <MenuItem
        onSelect={async () => {
          await auth.logout()
          setUser(null)
          navigate('/login', { replace: true })
        }}
      >
        Sair
      </MenuItem>
    </>
  )
  return (
    <>
      {phone ? (
        <>
          <BottomBarItem label="Conta" expanded={sheet} onClick={() => setSheet(true)}>
            <span aria-hidden="true" className={bar.classes.initials()} data-testid={bar.ids.initials}>
              {user.initials}
            </span>
          </BottomBarItem>
          <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Conta">
            <div role="menu" aria-label="Menu do usuário">
              <MenuContext.Provider value={{ close: () => setSheet(false) }}>{items}</MenuContext.Provider>
            </div>
          </BottomSheet>
        </>
      ) : (
        <Menu label="Menu do usuário" trigger={<UserBadge initials={user.initials} name={user.username} />}>
          {items}
        </Menu>
      )}
      <AboutDialog open={about} onClose={() => setAbout(false)} version={RELEASE_VERSION} notes={RELEASE_NOTES} />
    </>
  )
}
