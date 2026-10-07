import { useRef, useState, type ComponentRef } from 'react';
import { ScrollView, TextInput, View, type ViewStyle } from 'react-native';
import { loginErrors, type Credentials, type LoginErrors } from '@apc/shared/auth';
import { lockIcon, userIcon } from '@apc/shared/icons';
import { scales } from '@apc/shared/theme';
import { BrandMark } from '../BrandMark';
import { Button } from '../Button';
import { Panel } from '../Panel';
import { TextField } from '../TextField';

// The first screen of the app, the same as the web's /login on a phone: the APC badge on a panel above the form.
// "Entrar", or the keyboard's "go" key in the password, sends the login, and "next" in the user moves on to the
// password. An empty field isn't sent but shows its message under it, and the cursor goes to the first empty
// one. A field's message goes away once it is typed into. "Esqueceu a senha?" opens its dialog in a later task
// (#66).

const ACTIONS_STYLE: ViewStyle = { alignItems: 'flex-start', gap: scales.space.s2 };
// The badge at the size the web gives it on a phone (w-36).
const BADGE_WIDTH = scales.space.s1 * 36;
// The form keeps a phone's width on wider screens, centered, as wide as the web's form (max-w-sm).
const CONTENT_STYLE: ViewStyle = {
  flexGrow: 1,
  justifyContent: 'center',
  alignSelf: 'center',
  width: '100%',
  maxWidth: scales.space.s1 * 96,
  gap: scales.space.s5,
  padding: scales.space.s4,
};
const FIELD_ORDER = ['username', 'password'] as const;
const FORM_STYLE: ViewStyle = { gap: scales.space.s4 };
const MARK_PANEL_STYLE: ViewStyle = { alignItems: 'center', paddingVertical: scales.space.s5 };
const PAGE_STYLE: ViewStyle = { flex: 1 };

type LoginScreenProps = {
  /** Called with the filled-in fields; the owner logs in with them. */
  onSubmit: (credentials: Credentials) => void;
};

export function LoginScreen({ onSubmit }: LoginScreenProps) {
  const [credentials, setCredentials] = useState<Credentials>({ username: '', password: '' });
  const [errors, setErrors] = useState<LoginErrors>({});
  const usernameInput = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordInput = useRef<ComponentRef<typeof TextInput>>(null);

  /** Takes a field's new value and drops its message. */
  const change = (field: keyof Credentials, value: string) => {
    setCredentials((typed) => ({ ...typed, [field]: value }));
    setErrors((shown) => ({ ...shown, [field]: undefined }));
  };

  /** Sends the login, or shows the message of each empty field and moves to the first one. */
  const submit = () => {
    const found = loginErrors(credentials);
    setErrors(found);
    const empty = FIELD_ORDER.find((field) => found[field]);
    if (empty) {
      const input = empty === 'username' ? usernameInput : passwordInput;
      input.current?.focus();
      return;
    }
    onSubmit(credentials);
  };

  return (
    <ScrollView style={PAGE_STYLE} contentContainerStyle={CONTENT_STYLE} keyboardShouldPersistTaps="handled">
      <Panel style={MARK_PANEL_STYLE}>
        <View accessibilityRole="header">
          <BrandMark size={BADGE_WIDTH} />
        </View>
      </Panel>
      <View style={FORM_STYLE}>
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
        <View style={ACTIONS_STYLE}>
          <Button onPress={submit}>Entrar</Button>
          <Button variant="link">Esqueceu a senha?</Button>
        </View>
      </View>
    </ScrollView>
  );
}
