import { useRef, useState, type ComponentRef } from 'react';
import { Text as RNText, TextInput, View } from 'react-native';
import { LOGIN_BRAND, LOGIN_INTRO, LOGIN_MESSAGES, loginErrors, type AuthService, type Credentials, type LoginErrors, type SessionUser } from '@apc/shared/auth';
import { lockIcon, userIcon } from '@apc/shared/icons';
import { BrandMark } from '../BrandMark';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import { FieldScrollView } from '../FieldScrollView';
import { TextField } from '../TextField';
import { Text } from '../Typography';
import { useStyles } from './LoginScreen.styles';

// The first screen of the app, the same as the web's /login on a phone: one column with the APC mark over the name
// and the tagline, which head the screen as "APC Universal Repair", and what the login asks for, then the form, with
// "Esqueceu a senha?" at the right under the password and "Entrar" across, and "Criar conta" at the bottom.
// "Entrar", or the keyboard's "go" key in the password, sends the login, and "next" in the user moves on to the
// password. An empty field isn't sent but shows its message under it, and the cursor goes to the first empty
// one. A field's message goes away once it is typed into. While the login runs, "Entrar" shows it is busy and
// neither it nor the "go" key sends it again. A refused login shows one message above the form, without saying
// which field was wrong, and empties and focuses the password. "Esqueceu a senha?" opens a notice to ask the
// workshop's admin for a new password, as there is no reset until the real backend (EP-10); it closes on
// "Entendi", the back button or a tap outside. When the login can't be made (the API out of reach), it says so
// instead, keeping the password, as it does after too many attempts, saying how many minutes to wait. "Criar conta"
// opens the sign-up. A notice, such as the session having expired, shows above the form until a login is sent.

const FIELD_ORDER = ['username', 'password'] as const;

type LoginScreenProps = {
  /** Checks the user and password. */
  auth: AuthService;
  /** Said above the form until a login is sent, e.g. that the session expired. */
  notice?: string;
  /** Called with the user once the login is accepted, e.g. to open the Dashboard. */
  onLoggedIn: (user: SessionUser) => void;
  /** Opens the sign-up. */
  onRegister: () => void;
};

export function LoginScreen({ auth, notice, onLoggedIn, onRegister }: LoginScreenProps) {
  const [credentials, setCredentials] = useState<Credentials>({ username: '', password: '' });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [sending, setSending] = useState(false);
  // Why the last login didn't go through: the user or password refused, or the API out of reach.
  const [refused, setRefused] = useState<string>();
  // Whether a login was sent, which puts the notice away.
  const [sent, setSent] = useState(false);
  const [forgot, setForgot] = useState(false);
  const usernameInput = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordInput = useRef<ComponentRef<typeof TextInput>>(null);
  const { styles, ids } = useStyles();

  /** Takes a field's new value and drops its message. */
  const change = (field: keyof Credentials, value: string) => {
    setCredentials((typed) => ({ ...typed, [field]: value }));
    setErrors((shown) => ({ ...shown, [field]: undefined }));
  };

  /** Sends the login, or shows the message of each empty field and moves to the first one. */
  const submit = async () => {
    if (sending) {
      return;
    }
    const found = loginErrors(credentials);
    setErrors(found);
    const empty = FIELD_ORDER.find((field) => found[field]);
    if (empty) {
      const input = empty === 'username' ? usernameInput : passwordInput;
      input.current?.focus();
      return;
    }
    setRefused(undefined);
    setSent(true);
    setSending(true);
    const user = await auth.login(credentials).catch(() => undefined);
    setSending(false);
    if (user === undefined) {
      setRefused(LOGIN_MESSAGES.unreachable);
      return;
    }
    if (!user) {
      setRefused(LOGIN_MESSAGES.failed);
      setCredentials((typed) => ({ ...typed, password: '' }));
      passwordInput.current?.focus();
      return;
    }
    if ('refused' in user) {
      setRefused(user.refused);
      return;
    }
    onLoggedIn(user);
  };

  return (
    <FieldScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID={ids.page}>
      <View style={styles.heading} testID={ids.heading}>
        {/* The heading names the mark, so screen readers skip it. */}
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <BrandMark variant="compact" size={LOGIN_BRAND.mark} />
        </View>
        <View accessible accessibilityRole="header" accessibilityLabel="APC Universal Repair" style={styles.headingTitle} testID={ids.headingTitle}>
          <RNText style={styles.name} testID={ids.name}>
            APC
          </RNText>
          <RNText style={styles.tagline} testID={ids.tagline}>
            Universal Repair
          </RNText>
        </View>
        <View style={styles.intro} testID={ids.intro}>
          <Text tone="muted" align="center">
            {LOGIN_INTRO}
          </Text>
        </View>
      </View>
      <View style={styles.form} testID={ids.form}>
        {notice && !sent && (
          <View accessibilityLiveRegion="polite" style={styles.notice} testID={ids.notice}>
            <Text size="sm">{notice}</Text>
          </View>
        )}
        {refused && (
          <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.alert} testID={ids.alert}>
            <Text size="sm" tone="danger">
              {refused}
            </Text>
          </View>
        )}
        <TextField
          ref={usernameInput}
          label="Usuário"
          kind="username"
          icon={userIcon}
          value={credentials.username}
          onValueChange={(value) => change('username', value)}
          error={errors.username}
          returnKeyType="next"
          onSubmitEditing={() => passwordInput.current?.focus()}
        />
        <TextField
          ref={passwordInput}
          label="Senha"
          kind="password"
          icon={lockIcon}
          value={credentials.password}
          onValueChange={(value) => change('password', value)}
          error={errors.password}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <View style={styles.actions} testID={ids.actions}>
          <Button variant="link" align="end" onPress={() => setForgot(true)}>
            Esqueceu a senha?
          </Button>
          <Button align="stretch" onPress={submit} loading={sending}>
            Entrar
          </Button>
        </View>
      </View>
      <View style={styles.account} testID={ids.account}>
        <Text tone="muted" align="center">
          Ainda não tem conta?
        </Text>
        <Button variant="secondary" align="stretch" onPress={onRegister}>
          Criar conta
        </Button>
      </View>
      <Dialog
        open={forgot}
        onClose={() => setForgot(false)}
        title="Esqueceu a senha?"
        size="confirm"
        dismissible
        actions={<Button onPress={() => setForgot(false)}>Entendi</Button>}
      >
        <Text>{LOGIN_MESSAGES.forgotPassword}</Text>
      </Dialog>
    </FieldScrollView>
  );
}
