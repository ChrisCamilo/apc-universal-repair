import { useRef, useState, type FormEvent } from 'react'
import { LOGIN_MESSAGES, loginErrors, type AuthService, type Credentials, type LoginErrors, type SessionUser } from '@apc/shared/auth'
import { lockIcon, userIcon } from '@apc/shared/icons'
import { BrandMark } from '../components/BrandMark.tsx'
import { Button } from '../components/Button.tsx'
import { Panel } from '../components/Panel.tsx'
import { TextField } from '../components/TextField.tsx'
import { Text } from '../components/Typography.tsx'

// The first screen of the app (/login): the APC badge on a panel beside the form, or above it, smaller, on
// phones and narrow screens. "Entrar", or Enter in either field, sends the login; an empty field isn't sent but
// shows its message under it, and the cursor goes to the first empty one. A field's message goes away once it
// is typed into. While the login runs, "Entrar" shows it is busy and is disabled, so neither another press nor
// Enter (the browser only sends a form through an enabled submit button) sends it twice. A refused login shows
// one message above the form, without saying which field was wrong, and empties and focuses the password.
// "Esqueceu a senha?" opens its dialog in a later task (#66).

const FIELD_ORDER = ['username', 'password'] as const

type LoginScreenProps = {
  /** Checks the user and password. */
  auth: AuthService
  /** Called with the user once the login is accepted, e.g. to open the Dashboard. */
  onLoggedIn: (user: SessionUser) => void
}

export function LoginScreen({ auth, onLoggedIn }: LoginScreenProps) {
  const [credentials, setCredentials] = useState<Credentials>({ username: '', password: '' })
  const [errors, setErrors] = useState<LoginErrors>({})
  const [sending, setSending] = useState(false)
  const [refused, setRefused] = useState(false)
  const usernameInput = useRef<HTMLInputElement>(null)
  const passwordInput = useRef<HTMLInputElement>(null)

  /** Takes a field's new value and drops its message. */
  const change = (field: keyof Credentials, value: string) => {
    setCredentials((typed) => ({ ...typed, [field]: value }))
    setErrors((shown) => ({ ...shown, [field]: undefined }))
  }

  /** Sends the login, or shows the message of each empty field and moves to the first one. */
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const found = loginErrors(credentials)
    setErrors(found)
    const empty = FIELD_ORDER.find((field) => found[field])
    if (empty) {
      const input = empty === 'username' ? usernameInput : passwordInput
      input.current?.focus()
      return
    }
    setRefused(false)
    setSending(true)
    const user = await auth.login(credentials)
    setSending(false)
    if (!user) {
      setRefused(true)
      setCredentials((typed) => ({ ...typed, password: '' }))
      passwordInput.current?.focus()
      return
    }
    onLoggedIn(user)
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-8 sm:px-6">
      <div className="grid w-full max-w-4xl items-center gap-6 md:grid-cols-2 md:gap-12">
        <Panel className="grid place-items-center py-6 md:py-12">
          <h1 className="m-0 flex">
            <BrandMark className="h-auto w-36 md:w-56" />
          </h1>
        </Panel>
        <form noValidate className="grid w-full max-w-sm gap-4 max-md:justify-self-center" onSubmit={submit}>
          {refused && (
            <Text role="alert" size="sm" tone="danger">
              {LOGIN_MESSAGES.failed}
            </Text>
          )}
          <TextField
            ref={usernameInput}
            label="Usuário"
            kind="username"
            icon={userIcon}
            value={credentials.username}
            onValueChange={(value) => change('username', value)}
            error={errors.username}
          />
          <TextField
            ref={passwordInput}
            label="Senha"
            kind="password"
            icon={lockIcon}
            value={credentials.password}
            onValueChange={(value) => change('password', value)}
            error={errors.password}
          />
          <div className="grid justify-items-start gap-2">
            <Button type="submit" loading={sending}>
              Entrar
            </Button>
            <Button type="button" variant="link">
              Esqueceu a senha?
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
