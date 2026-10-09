import { useRef, useState, type ComponentRef } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { registerErrors, type AuthService, type RegisterErrors, type Registration, type SessionUser } from '@apc/shared/auth';
import type { FieldKind } from '@apc/shared/field';
import { lockIcon, userIcon, type IconShape } from '@apc/shared/icons';
import { BrandMark } from '../BrandMark';
import { Button } from '../Button';
import { Panel } from '../Panel';
import { TextField } from '../TextField';
import { Text } from '../Typography';
import { BADGE_WIDTH } from './LoginScreen.styles';
import { useStyles } from './RegisterScreen.styles';

// The sign-up screen, the same as the web's /register on a phone: the APC badge on a panel above the form, which asks
// for the name, the username, the e-mail (only kept for now) and the password, typed twice. "next" on the keyboard
// moves on to the next field and "go" in the last one sends it, as "Criar conta" does, once every field keeps its rule
// (see registerErrors); otherwise each field that breaks one shows its message under it and the cursor goes to the
// first. A field's message goes away once it is typed into. While it runs, "Criar conta" shows it is busy and isn't
// sent again. Refused (the username taken, or the API out of reach), it says why above the form; created, the new user
// is logged in and handed over. "Já tem conta? Entrar" goes back to the login.

const EMPTY: Registration = { displayName: '', username: '', email: '', password: '', confirm: '' };
/** The fields in form order, with their label, kind and icon. */
const FIELDS: { name: keyof Registration; label: string; kind: FieldKind; icon?: IconShape[]; helper?: string }[] = [
  { name: 'displayName', label: 'Nome', kind: 'name' },
  { name: 'username', label: 'Usuário', kind: 'username', icon: userIcon, helper: 'Letras minúsculas, números, pontos ou hífens.' },
  { name: 'email', label: 'E-mail', kind: 'email' },
  { name: 'password', label: 'Senha', kind: 'newPassword', icon: lockIcon },
  { name: 'confirm', label: 'Confirmar senha', kind: 'newPassword', icon: lockIcon },
];

type RegisterScreenProps = {
  /** Creates the user and logs them in. */
  auth: AuthService;
  /** Called with the new user once they are created and logged in, e.g. to open the Dashboard. */
  onRegistered: (user: SessionUser) => void;
  /** Goes back to the login. */
  onLogin: () => void;
};

export function RegisterScreen({ auth, onRegistered, onLogin }: RegisterScreenProps) {
  const [registration, setRegistration] = useState<Registration>(EMPTY);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [sending, setSending] = useState(false);
  const [refused, setRefused] = useState<string>();
  const inputs = useRef<Partial<Record<keyof Registration, ComponentRef<typeof TextInput> | null>>>({});
  const { styles, ids } = useStyles();

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
    const found = registerErrors(registration);
    setErrors(found);
    const wrong = FIELDS.find(({ name }) => found[name]);
    if (wrong) {
      inputs.current[wrong.name]?.focus();
      return;
    }
    setRefused(undefined);
    setSending(true);
    const { displayName, username, email, password } = registration;
    const result = await auth.register({ displayName, username, email, password });
    setSending(false);
    if ('refused' in result) {
      setRefused(result.refused);
      return;
    }
    onRegistered(result.user);
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
              {refused}
            </Text>
          </View>
        )}
        {FIELDS.map(({ name, label, kind, icon, helper }, index) => {
          const next = FIELDS[index + 1];
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
          <Button onPress={submit} loading={sending}>
            Criar conta
          </Button>
          <Button variant="link" onPress={onLogin}>
            Já tem conta? Entrar
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}
