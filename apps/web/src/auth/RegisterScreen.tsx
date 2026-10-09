import { useRef, useState, type FormEvent } from 'react'
import { registerErrors, type AuthService, type RegisterErrors, type Registration, type SessionUser } from '@apc/shared/auth'
import { lockIcon, userIcon } from '@apc/shared/icons'
import { BrandMark } from '../components/BrandMark.tsx'
import { Button } from '../components/Button.tsx'
import { Panel } from '../components/Panel.tsx'
import { TextField } from '../components/TextField.tsx'
import { Text } from '../components/Typography.tsx'
import { registerScreen } from './RegisterScreen.styles.ts'

// The sign-up screen (/register), laid out as the login: the APC badge on a panel beside the form, or above it on
// phones. The form asks for the name, the username, the e-mail (only kept for now) and the password, typed twice.
// "Criar conta", or Enter in a field, sends it once every field keeps its rule (see registerErrors); otherwise each
// field that breaks one shows its message under it and the cursor goes to the first. A field's message goes away once
// it is typed into. While it runs, "Criar conta" shows it is busy and is disabled. Refused (the username taken, or
// the API out of reach), it says why above the form; created, the new user is logged in and handed over.
// "Já tem conta? Entrar" goes back to the login.

const EMPTY: Registration = { displayName: '', username: '', email: '', password: '', confirm: '' }
const FIELD_ORDER = ['displayName', 'username', 'email', 'password', 'confirm'] as const

type RegisterScreenProps = {
  /** Creates the user and logs them in. */
  auth: AuthService
  /** Called with the new user once they are created and logged in, e.g. to open the Dashboard. */
  onRegistered: (user: SessionUser) => void
  /** Goes back to the login. */
  onLogin: () => void
}

export function RegisterScreen({ auth, onRegistered, onLogin }: RegisterScreenProps) {
  const [registration, setRegistration] = useState<Registration>(EMPTY)
  const [errors, setErrors] = useState<RegisterErrors>({})
  const [sending, setSending] = useState(false)
  const [refused, setRefused] = useState<string>()
  const inputs = useRef<Partial<Record<keyof Registration, HTMLInputElement | null>>>({})
  const { classes, ids } = registerScreen()

  /** Takes a field's new value and drops its message. */
  const change = (field: keyof Registration, value: string) => {
    setRegistration((typed) => ({ ...typed, [field]: value }))
    setErrors((shown) => ({ ...shown, [field]: undefined }))
  }

  /** Sends the sign-up, or shows the message of each field that breaks a rule and moves to the first one. */
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const found = registerErrors(registration)
    setErrors(found)
    const wrong = FIELD_ORDER.find((field) => found[field])
    if (wrong) {
      inputs.current[wrong]?.focus()
      return
    }
    setRefused(undefined)
    setSending(true)
    const { confirm: _confirm, ...user } = registration
    const result = await auth.register(user)
    setSending(false)
    if ('refused' in result) {
      setRefused(result.refused)
      return
    }
    onRegistered(result.user)
  }

  /** Builds the props every field shares: its value, its message and where its input is kept. */
  const field = (name: keyof Registration) => ({
    ref: (input: HTMLInputElement | null) => {
      inputs.current[name] = input
    },
    value: registration[name],
    onValueChange: (value: string) => change(name, value),
    error: errors[name],
  })

  return (
    <main className={classes.base()} data-testid={ids.base}>
      <div className={classes.layout()} data-testid={ids.layout}>
        <Panel className={classes.brand()}>
          <h1 className={classes.title()} data-testid={ids.title}>
            <BrandMark className={classes.mark()} />
          </h1>
        </Panel>
        <form noValidate className={classes.form()} data-testid={ids.form} onSubmit={submit}>
          {refused && (
            <Text role="alert" size="sm" tone="danger">
              {refused}
            </Text>
          )}
          <TextField label="Nome" kind="name" {...field('displayName')} />
          <TextField label="Usuário" kind="username" icon={userIcon} helper="Letras minúsculas, números, pontos ou hífens." {...field('username')} />
          <TextField label="E-mail" kind="email" {...field('email')} />
          <TextField label="Senha" kind="newPassword" icon={lockIcon} {...field('password')} />
          <TextField label="Confirmar senha" kind="newPassword" icon={lockIcon} {...field('confirm')} />
          <div className={classes.actions()} data-testid={ids.actions}>
            <Button type="submit" loading={sending}>
              Criar conta
            </Button>
            <Button type="button" variant="link" onClick={onLogin}>
              Já tem conta? Entrar
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
