import { useRef, useState, type FormEvent } from 'react'
import {
  LOGIN_BRAND,
  LOGIN_INTRO,
  LOGIN_MESSAGES,
  loginErrors,
  type AuthService,
  type Credentials,
  type LoginErrors,
  type SessionUser,
} from '@apc/shared/auth'
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
// When the login can't be made (the API out of reach), it says so instead, keeping the password, as it does after
// too many attempts, saying how many minutes to wait.
// "Esqueceu a senha?" opens a notice to ask the workshop's admin for a new password, as there is no reset until
// the real backend (EP-10); it closes on "Entendi", Escape or a click outside, and the focus goes back to the link.
// "Criar conta" opens the sign-up. In the desktop app, "Servidor e banco de dados" opens the Servidor dialog with no
// session, so an old server can be imported while the database is still empty. A notice, such as the session having
// expired, shows above the form until a login is sent. The fields may open filled in, as the web app's demo fills in
// its user.
// On a phone it is one column, as in the native app: the mark with the name and the tagline as the page's heading in
// place of the badge, what the login asks for, "Esqueceu a senha?" under the password, "Entrar" across, and the
// question with "Criar conta" at the bottom (see LoginScreen.styles.ts).

const FIELD_ORDER = ['username', 'password'] as const

type LoginScreenProps = {
  /** Checks the user and password. */
  auth: AuthService
  /** Said above the form until a login is sent, e.g. that the session expired. */
  notice?: string
  /** Called with the user once the login is accepted, e.g. to open the Dashboard. */
  onLoggedIn: (user: SessionUser) => void
  /** Opens the sign-up. */
  onRegister: () => void
  /** Opens the desktop app's Servidor dialog; without it, as in a browser, there is no link. */
  onServerSettings?: () => void
  /** The fields filled in on opening, e.g. the demo's user; empty otherwise. */
  initialCredentials?: Credentials
}

export function LoginScreen({ auth, notice, onLoggedIn, onRegister, onServerSettings, initialCredentials }: LoginScreenProps) {
  const [credentials, setCredentials] = useState<Credentials>(initialCredentials ?? { username: '', password: '' })
  const [errors, setErrors] = useState<LoginErrors>({})
  const [sending, setSending] = useState(false)
  // Why the last login didn't go through: the user or password refused, or the API out of reach.
  const [refused, setRefused] = useState<string>()
  // Whether a login was sent, which puts the notice away.
  const [sent, setSent] = useState(false)
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
    setSent(true)
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
    if ('refused' in user) {
      setRefused(user.refused)
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
        {/* The phone's brand, in place of the badge's panel: the mark, which the heading names, and the name as the
            page's heading, read "APC Universal Repair". */}
        <div className={classes.heading()} data-testid={ids.heading}>
          <BrandMark variant="compact" size={LOGIN_BRAND.mark} aria-hidden />
          <h1 className={classes.headingTitle()} data-testid={ids.headingTitle}>
            <span className={classes.name()} data-testid={ids.name}>
              APC
            </span>{' '}
            <span className={classes.tagline()} data-testid={ids.tagline}>
              Universal Repair
            </span>
          </h1>
          <Text tone="muted" className={classes.intro()}>
            {LOGIN_INTRO}
          </Text>
        </div>
        <form noValidate className={classes.form()} data-testid={ids.form} onSubmit={submit}>
          {notice && !sent && (
            <Text role="status" size="sm">
              {notice}
            </Text>
          )}
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
            <Button type="submit" loading={sending} className={classes.submit()}>
              Entrar
            </Button>
            <Button type="button" variant="link" onClick={() => setForgot(true)} className={classes.forgot()}>
              Esqueceu a senha?
            </Button>
            <Button type="button" variant="link" onClick={onRegister} className={classes.registerLink()}>
              Criar conta
            </Button>
            {onServerSettings && (
              <Button type="button" variant="link" onClick={onServerSettings}>
                Servidor e banco de dados
              </Button>
            )}
          </div>
        </form>
        <div className={classes.account()} data-testid={ids.account}>
          <Text tone="muted">Ainda não tem conta?</Text>
          <Button type="button" variant="secondary" onClick={onRegister} className={classes.accountButton()}>
            Criar conta
          </Button>
        </div>
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
