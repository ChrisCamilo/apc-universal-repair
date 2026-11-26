import { useRef, useState, type ComponentRef } from 'react';
import { Text as RNText, TextInput, View } from 'react-native';
import { registerErrors, type AuthService, type RegisterErrors, type Registration, type SessionUser } from '@apc/domain/auth';
import { DEVICE_MESSAGES } from '@apc/domain/devices';
import { useMessages } from '../../app/locale';
import type { FieldKind } from '@apc/ui-spec/field';
import { lockIcon, userIcon, type IconShape } from '@apc/tokens/icons';
import { BackButton } from '../../components/BackButton';
import { Button } from '../../components/Button';
import { FieldScrollView } from '../../components/FieldScrollView';
import { TextField } from '../../components/TextField';
import { Text } from '../../components/Typography';
import { DevicePending } from './DevicePending';
import { useStyles } from './RegisterScreen.styles';
import { useDeviceWait } from './useDeviceWait';
import { useLocale } from '../../app/locale';
import { AUTH_TEXTS } from '@apc/domain/auth-texts';
import { perLocale } from '@apc/domain/locale';

// The sign-up screen, the same as the web's /register on a phone: a header with the back arrow to the login and
// "Criar conta" as the screen's heading, then the form, which asks for the name, the username, the e-mail (only kept
// for now) and the password, typed twice, with "Criar conta" across and "Já tem conta? Entrar" at the bottom of the
// screen. "next" on the keyboard moves on to the next field and "go" in the last one sends it, as "Criar conta" does,
// once every field keeps its rule (see registerErrors); otherwise each field that breaks one shows its message under it
// and the cursor goes to the first. A field's message goes away once it is typed into. While it runs, "Criar conta"
// shows it is busy and isn't sent again. Refused (the username taken, or the API out of reach), it says why above the
// form; created, the new user is logged in and handed over. From a phone the server's computer hasn't authorized, the
// user is created and the screen shows the phone's code and waits (see DevicePending.tsx), logging in by itself once it
// is authorized. The back arrow and "Já tem conta? Entrar" go back to the
// login. With the keyboard up, the screen scrolls to reach every field.

const EMPTY: Registration = { displayName: '', username: '', email: '', password: '', confirm: '' };
/** The fields in form order, with their label in each language, kind and icon. */
const FIELDS = perLocale((locale): { name: keyof Registration; label: string; kind: FieldKind; icon?: IconShape[]; helper?: string }[] => {
  const { login, register } = AUTH_TEXTS[locale];
  return [
    { name: 'displayName', label: register.name, kind: 'name' },
    { name: 'username', label: login.username, kind: 'username', icon: userIcon, helper: register.usernameHint },
    { name: 'email', label: register.email, kind: 'email' },
    { name: 'password', label: login.password, kind: 'newPassword', icon: lockIcon },
    { name: 'confirm', label: register.confirm, kind: 'newPassword', icon: lockIcon },
  ];
});

type RegisterScreenProps = {
  /** Creates the user and logs them in. */
  auth: AuthService;
  /** Called with the new user once they are created and logged in, e.g. to open the Dashboard. */
  onRegistered: (user: SessionUser) => void;
  /** Goes back to the login. */
  onLogin: () => void;
};

export function RegisterScreen({ auth, onRegistered, onLogin }: RegisterScreenProps) {
  const { locale } = useLocale();
  const [registration, setRegistration] = useState<Registration>(EMPTY);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [sending, setSending] = useState(false);
  const [refused, setRefused] = useState<string>();
  const inputs = useRef<Partial<Record<keyof Registration, ComponentRef<typeof TextInput> | null>>>({});
  const { styles, ids } = useStyles();
  const deviceMessages = useMessages(DEVICE_MESSAGES);
  const { login, register: texts } = AUTH_TEXTS[locale];
  const fields = FIELDS[locale];
  const device = useDeviceWait(auth, onRegistered, () => setRefused(deviceMessages.refused));

  /** Takes a field's new value and drops its message. */
  const change = (field: keyof Registration, value: string) => {
    setRegistration((typed) => ({ ...typed, [field]: value }));
    setErrors((shown) => ({ ...shown, [field]: undefined }));
  };

  /** Sends the sign-up, or shows the message of each field that breaks a rule and moves to the first one. */
  const submit = async () => {
    if (sending) {
      return;
    }
    const found = registerErrors(registration, locale);
    setErrors(found);
    const wrong = fields.find(({ name }) => found[name]);
    if (wrong) {
      inputs.current[wrong.name]?.focus();
      return;
    }
    setRefused(undefined);
    setSending(true);
    const { displayName, username, email, password } = registration;
    const result = await auth.register({ displayName, username, email, password }, locale);
    setSending(false);
    if ('refused' in result) {
      setRefused(result.refused);
      return;
    }
    if ('pending' in result) {
      device.wait({ code: result.pending, credentials: { username, password } });
      return;
    }
    onRegistered(result.user);
  };

  return (
    <FieldScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID={ids.page}>
      <View style={styles.header} testID={ids.header}>
        <BackButton label={texts.back} onPress={onLogin} />
        <RNText accessibilityRole="header" style={styles.headerTitle} testID={ids.headerTitle}>
          {texts.title}
        </RNText>
      </View>
      <View style={styles.form} testID={ids.form}>
        {refused && (
          <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.alert} testID={ids.alert}>
            <Text size="sm" tone="danger">
              {refused}
            </Text>
          </View>
        )}
        {device.waiting && <DevicePending code={device.waiting.code} />}
        {fields.map(({ name, label, kind, icon, helper }, index) => {
          const next = fields[index + 1];
          return (
            <TextField
              key={name}
              ref={(input) => {
                inputs.current[name] = input;
              }}
              label={label}
              kind={kind}
              icon={icon}
              helper={helper}
              value={registration[name]}
              onValueChange={(value) => change(name, value)}
              error={errors[name]}
              returnKeyType={next ? 'next' : 'go'}
              onSubmitEditing={next ? () => inputs.current[next.name]?.focus() : submit}
            />
          );
        })}
        <View style={styles.actions} testID={ids.actions}>
          <Button align="stretch" onPress={submit} loading={sending}>
            {texts.title}
          </Button>
          <Button variant="link" align="stretch" label={`${texts.hasAccount} ${login.logIn}`} onPress={onLogin}>
            {texts.hasAccount} <RNText style={styles.loginAction} testID={ids.loginAction}>
              {login.logIn}
            </RNText>
          </Button>
        </View>
      </View>
    </FieldScrollView>
  );
}
