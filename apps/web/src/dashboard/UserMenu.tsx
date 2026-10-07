import { useState } from 'react'
import { REORDER_TABS_STORAGE_KEY } from '@apc/shared/tabs'
import { isStyle, STYLE_LABELS, STYLES } from '@apc/shared/theme'
import { useSession } from '../auth/sessionContext.ts'
import { Menu, MenuHeader, MenuLabel, UserBadge } from '../components/Menu.tsx'
import { Segmented } from '../components/Segmented.tsx'
import { Switch } from '../components/Switch.tsx'
import { readStored, writeStored } from '../storage.ts'
import { useTheme } from '../useTheme.ts'

// The user menu at the right of the Dashboard header: the logged user's initials and username on the trigger
// (initials only on phones), and the display preferences. Dark mode and the theme go through the ThemeProvider,
// which applies and saves them at once; "Arrastar para reordenar" is saved on the device, off until turned on,
// and the tabs follow it (#42). Every choice keeps the menu open, so several can be changed in a row.

const STYLE_OPTIONS = STYLES.map((style) => ({ value: style, label: STYLE_LABELS[style] }))

export function UserMenu() {
  const user = useSession().user!
  const { style, mode, setStyle, setMode } = useTheme()
  const [reorder, setReorder] = useState(() => readStored(REORDER_TABS_STORAGE_KEY) === 'true')
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
          setReorder(on)
          writeStored(REORDER_TABS_STORAGE_KEY, String(on))
        }}
        description="Troque a ordem pelo puxador ou com Alt + setas"
      >
        Arrastar para reordenar
      </Switch>
    </Menu>
  )
}
