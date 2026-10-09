import { useRef, useState, type ComponentRef } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { LOGIN_MESSAGES, loginErrors, type AuthService, type Credentials, type LoginErrors, type SessionUser } from '@apc/shared/auth';
import { lockIcon, userIcon } from '@apc/shared/icons';
import { BrandMark } from '../BrandMark';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import { Panel } from '../Panel';
import { TextField } from '../TextField';
import { Text } from '../Typography';
import { BADGE_WIDTH, useStyles } from './LoginScreen.styles';

// The first screen of the app, the same as the web's /login on a phone: the APC badge on a panel above the form.
// "Entrar", or the keyboard's "go" key in the password, sends the login, and "next" in the user moves on to the
// password. An empty field isn't sent but shows its message under it, and the cursor goes to the first empty
// one. A field's message goes away once it is typed into. While the login runs, "Entrar" shows it is busy and
// neither it nor the "go" key sends it again. A refused login shows one message above the form, without saying
// which field was wrong, and empties and focuses the password. "Esqueceu a senha?" opens a notice to ask the
// workshop's admin for a new password, as there is no reset until the real backend (EP-10); it closes on
// "Entendi", the back button or a tap outside.

const FIELD_ORDER = ['username', 'password'] as const;

type LoginScreenProps = {
  /** Checks the user and password. */
  auth: AuthService;
  /** Called with the user once the login is accepted, e.g. to open the Dashboard. */
  onLoggedIn: (user: SessionUser) => void;
};

export function LoginScreen({ auth, onLoggedIn }: LoginScreenProps) {
  const [credentials, setCredentials] = useState<Credentials>({ username: '', password: '' });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [sending, setSending] = useState(false);
  const [refused, setRefused] = useState(false);
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
    setRefused(false);
    setSending(true);
    const user = await auth.login(credentials);
    setSending(false);
    if (!user) {
      setRefused(true);
      setCredentials((typed) => ({ ...typed, password: '' }));
      passwordInput.current?.focus();
      return;
    }
    onLoggedIn(user);
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID={ids.page}>
      <Panel style={styles.brand}>
        <View accessibilityRole="header" style={styles.title} testID={ids.title}>
          <BrandMark size={BADGE_WIDTH} />
        </View>
      </Panel>
      <View style={styles.form} testID={ids.form}>
        {refused && (
          <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.alert} testID={ids.alert}>
            <Text size="sm" tone="danger">
              {LOGIN_MESSAGES.failed}
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
          <Button onPress={submit} loading={sending}>
            Entrar
          </Button>
          <Button variant="link" onPress={() => setForgot(true)}>
            Esqueceu a senha?
          </Button>
        </View>
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
    </ScrollView>
  );
}
