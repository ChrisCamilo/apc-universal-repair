import type { ReactNode } from 'react'
import { ICON_SIZES, mechanicIcon } from '@apc/shared/icons'
import { Icon } from './Icon.tsx'
import { Panel } from './Panel.tsx'
import { Heading, Text } from './Typography.tsx'
import { workInProgress } from './WorkInProgress.styles.ts'

// A screen still being built, such as a Dashboard tab marked `wip`: its content shows blurred and out of reach (it
// can't be clicked, focused or read out) behind a notice with a mechanic at work, saying the screen isn't ready yet.

type WorkInProgressProps = {
  /** The screen's name, e.g. "Catálogo": "A aba Catálogo ainda não está pronta". */
  label: string
  /** The screen as it is so far, shown blurred behind the notice. */
  children: ReactNode
}

export function WorkInProgress({ label, children }: WorkInProgressProps) {
  const { classes, ids } = workInProgress()
  return (
    <div className={classes.base()} data-testid={ids.base}>
      <div inert className={classes.content()} data-testid={ids.content}>
        {children}
      </div>
      <div className={classes.overlay()} data-testid={ids.overlay}>
        <Panel className={classes.notice()}>
          <span aria-hidden="true" className={classes.illustration()} data-testid={ids.illustration}>
            <Icon icon={mechanicIcon} size={ICON_SIZES.viewer} />
          </span>
          <Heading level={3}>A aba {label} ainda não está pronta</Heading>
          <Text size="sm" tone="muted">
            Estamos trabalhando nela. Volte em breve.
          </Text>
        </Panel>
      </div>
    </div>
  )
}
