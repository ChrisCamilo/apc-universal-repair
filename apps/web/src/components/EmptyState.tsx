import { alertIcon, cubeIcon, type IconShape } from '@apc/shared/icons'
import { Button } from './Button.tsx'
import { Icon } from './Icon.tsx'
import { Heading, Text } from './Typography.tsx'

// What a screen or panel shows when there is nothing to list, or when loading failed: an icon, a short title,
// a line that says what to do next and an optional action, centered. The empty state is muted. The error
// state draws its icon in the danger color and is announced as an alert; its copy says what failed and what
// to do next, with no apologies or vague wording.

type StateMessageProps = {
  /** Icon from @apc/shared/icons; the empty state defaults to the cube and the error state to the alert. */
  icon?: IconShape[]
  /** What is going on, e.g. "Nenhum item cadastrado" or "Não foi possível carregar o estoque". */
  title: string
  /** What to do next, e.g. "Verifique a conexão com o servidor e tente de novo." */
  message: string
  /** A button under the message, e.g. "Adicionar item" or "Tentar de novo". */
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon = cubeIcon, ...rest }: StateMessageProps) {
  return <StateMessage icon={icon} iconClass="text-text-muted" {...rest} />
}

export function ErrorState({ icon = alertIcon, ...rest }: StateMessageProps) {
  return <StateMessage icon={icon} iconClass="text-danger" role="alert" {...rest} />
}

function StateMessage({
  icon,
  iconClass,
  role,
  title,
  message,
  action,
}: StateMessageProps & { icon: IconShape[]; iconClass: string; role?: 'alert' }) {
  return (
    <div role={role} className="grid justify-items-center gap-2 px-4 py-8 text-center">
      <span className={iconClass}>
        <Icon icon={icon} size={40} />
      </span>
      <Heading level={4}>{title}</Heading>
      <Text size="sm" tone="muted" className="max-w-prose">
        {message}
      </Text>
      {action && (
        <Button variant="secondary" size="sm" className="mt-2" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
