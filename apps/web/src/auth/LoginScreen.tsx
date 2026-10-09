import { useRef, useState, type FormEvent } from 'react'
import { LOGIN_MESSAGES, loginErrors, type AuthService, type Credentials, type LoginErrors, type SessionUser } from '@apc/shared/auth'
import { lockIcon, userIcon } from '@apc/shared/icons'
import { BrandMark } from '../components/BrandMark.tsx'
import { Button } from '../components/Button.tsx'
import { Dialog } from '../components/Dialog.tsx'
import { Panel } from '../components/Panel.tsx'
import { TextField } from '../components/TextField.tsx'
import { Text } from '../components/Typography.tsx'
import { loginScreen } from './LoginScreen.styles.ts'

// The first screen of the app (/login): the APC badge on a panel beside the form, or above it, smaller, on
// phones and narrow screens. "Entrar", or Enter in either field, sends the login; an empty field isn't sent but
// shows its message under it, and the cursor goes to the first empty one. A field's message goes away once it
// is typed into. While the login runs, "Entrar" shows it is busy and is disabled, so neither another press nor
// Enter (the browser only sends a form through an enabled submit button) sends it twice. A refused login shows
// one message above the form, without saying which field was wrong, and empties and focuses the password.
// When the login can't be made (the API out of reach), it says so instead, keeping the password.
// "Esqueceu a senha?" opens a notice to ask the workshop's admin for a new password, as there is no reset until
// the real backend (EP-10); it closes on "Entendi", Escape or a click outside, and the focus goes back to the link.
// "Criar conta" opens the sign-up.

const FIELD_ORDER = ['username', 'password'] as const

type LoginScreenProps = {
  /** Checks the user and password. */
  auth: AuthService
  /** Called with the user once the login is accepted, e.g. to open the Dashboard. */
  onLoggedIn: (user: SessionUser) => void
  /** Opens the sign-up. */
  onRegister: () => void
}

export function LoginScreen({ auth, onLoggedIn, onRegister }: LoginScreenProps) {
  const [credentials, setCredentials] = useState<Credentials>({ username: '', password: '' })
  const [errors, setErrors] = useState<LoginErrors>({})
  const [sending, setSending] = useState(false)
  // Why the last login didn't go through: the user or password refused, or the API out of reach.
  const [refused, setRefused] = useState<string>()
  const [forgot, setForgot] = useState(false)
  const usernameInput = useRef<HTMLInputElement>(null)
  const passwordInput = useRef<HTMLInputElement>(null)
  const { classes, ids } = loginScreen()

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
    setRefused(undefined)
    setSending(true)
    const user = await auth.login(credentials).catch(() => undefined)
    setSending(false)
    if (user === undefined) {
      setRefused(LOGIN_MESSAGES.unreachable)
      return
    }
    if (!user) {
      setRefused(LOGIN_MESSAGES.failed)
      setCredentials((typed) => ({ ...typed, password: '' }))
      passwordInput.current?.focus()
      return
    }
    onLoggedIn(user)
  }

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
          <div className={classes.actions()} data-testid={ids.actions}>
            <Button type="submit" loading={sending}>
              Entrar
            </Button>
            <Button type="button" variant="link" onClick={() => setForgot(true)}>
              Esqueceu a senha?
            </Button>
            <Button type="button" variant="link" onClick={onRegister}>
              Criar conta
            </Button>
          </div>
        </form>
      </div>
      <Dialog
        open={forgot}
        onClose={() => setForgot(false)}
        title="Esqueceu a senha?"
        size="confirm"
        dismissible
        actions={<Button onClick={() => setForgot(false)}>Entendi</Button>}
      >
        <Text>{LOGIN_MESSAGES.forgotPassword}</Text>
      </Dialog>
    </main>
  )
}
