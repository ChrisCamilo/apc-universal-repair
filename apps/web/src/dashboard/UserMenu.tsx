import { useState } from 'react'
import { useNavigate } from 'react-router'
import { RELEASE_NOTES, RELEASE_VERSION } from 'virtual:apc-release'
import { gearIcon, infoIcon, playIcon } from '@apc/shared/icons'
import { PAGE_SIZES } from '@apc/shared/pagination'
import { isStyle, STYLE_LABELS, STYLES } from '@apc/shared/theme'
import { auth } from '../auth/auth.ts'
import { useSession } from '../auth/sessionContext.ts'
import { Menu, MenuHeader, MenuItem, MenuLabel, UserBadge } from '../components/Menu.tsx'
import { Divider } from '../components/Panel.tsx'
import { Segmented } from '../components/Segmented.tsx'
import { Switch } from '../components/Switch.tsx'
import { desktopBridge } from '../desktop/desktopBridge.ts'
import { useOpenServerSettings } from '../desktop/serverSettingsContext.ts'
import { useTheme } from '../useTheme.ts'
import { AboutDialog } from './AboutDialog.tsx'
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
  // Nobody to show for a moment after "Sair", until the app leaves the Dashboard.
  if (!user) {
    return null
  }
  return (
    <>
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
      </Menu>
      <AboutDialog open={about} onClose={() => setAbout(false)} version={RELEASE_VERSION} notes={RELEASE_NOTES} />
    </>
  )
}
