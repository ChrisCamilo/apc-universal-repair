import { useNavigate } from 'react-router'
import { isStyle, STYLE_LABELS, STYLES } from '@apc/shared/theme'
import { auth } from '../auth/auth.ts'
import { useSession } from '../auth/sessionContext.ts'
import { Menu, MenuHeader, MenuItem, MenuLabel, UserBadge } from '../components/Menu.tsx'
import { Divider } from '../components/Panel.tsx'
import { Segmented } from '../components/Segmented.tsx'
import { Switch } from '../components/Switch.tsx'
import { useTheme } from '../useTheme.ts'
import { useOpenItemOnRow } from './openItemOnRowContext.ts'
import { useTabReorder } from './tabReorderContext.ts'

// The user menu at the right of the Dashboard header: the logged user's initials and username on the trigger
// (initials only on phones), and the display preferences. Dark mode and the theme go through the ThemeProvider,
// which applies and saves them at once; "Arrastar para reordenar" goes through the Dashboard (TabReorderContext),
// which saves it and makes the tabs reorderable while it is on, and "Abrir item ao clicar na linha" likewise makes
// the Inventory rows open the item details. Every choice keeps the menu open, so several can be changed in a row.
// "Sair", at the end and set apart from the preferences, ends the session and goes back to /login; the preferences
// stay on the device for the next login.

const STYLE_OPTIONS = STYLES.map((style) => ({ value: style, label: STYLE_LABELS[style] }))

export function UserMenu() {
  const { user, setUser } = useSession()
  const navigate = useNavigate()
  const { style, mode, setStyle, setMode } = useTheme()
  const { reorderable, setReorderable } = useTabReorder()
  const { opensOnRow, setOpensOnRow } = useOpenItemOnRow()
  // Nobody to show for a moment after "Sair", until the app leaves the Dashboard.
  if (!user) {
    return null
  }
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
      <Switch
        checked={opensOnRow}
        onCheckedChange={setOpensOnRow}
        description="Mostra os detalhes; editar fica a um clique"
      >
        Abrir item ao clicar na linha
      </Switch>
      <Divider />
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
  )
}
