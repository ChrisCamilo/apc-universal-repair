import { useRef, useState, type ComponentRef, type Ref } from 'react';
import { Pressable, Text as NativeText, TextInput, View, type ReturnKeyTypeOptions } from 'react-native';
import { FIELD_KINDS, type FieldKind } from '@apc/shared/field';
import { closeIcon, eyeIcon, searchIcon, type IconShape } from '@apc/shared/icons';
import { Icon } from './Icon';
import { TRAILING_HIT_SLOP, useSearchStyles, useStyles } from './TextField.styles';
import { useTheme } from './theme';
import { Label, Text } from './Typography';

// The pill-shaped inputs, the same as the web (see TextField.styles.ts). Each field kind sets the keyboard, autofill
// hint and capitalization (see @apc/shared/field).

type SearchFieldProps = {
  /** Accessible name; the search shows no visible label, so it is also the placeholder. */
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
};
type TextFieldProps = {
  /** The input itself, e.g. to focus it. */
  ref?: Ref<ComponentRef<typeof TextInput>>;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Kind of data, which sets the keyboard and autofill; "password" adds the reveal toggle. */
  kind?: FieldKind;
  /** Leading icon from @apc/shared/icons. */
  icon?: IconShape[];
  /** Hint shown under the field while there is no error. */
  helper?: string;
  /** Error shown under the field in the danger color; marks the field invalid. */
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Label of the keyboard's return key, e.g. "next" to move on to the next field or "go" to send a form. */
  returnKeyType?: ReturnKeyTypeOptions;
  /** Called when the keyboard's return key is pressed. */
  onSubmitEditing?: () => void;
  /** Called when the field loses focus, e.g. to fix how its text is written. */
  onBlur?: () => void;
};

export function TextField({
  ref,
  label,
  value,
  onValueChange,
  kind = 'text',
  icon,
  helper,
  error,
  placeholder,
  disabled = false,
  returnKeyType,
  onSubmitEditing,
  onBlur,
}: TextFieldProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const spec = FIELD_KINDS[kind];
  const isPassword = kind === 'password';

  return (
    <View style={[styles.field, disabled && styles.fieldDisabled]} testID={ids.field}>
      <Label>{label}</Label>
      <View style={[styles.fieldRing, focused && (error ? styles.fieldRingError : styles.fieldRingFocused)]} testID={ids.fieldRing}>
        <View style={[styles.fieldFrame, focused && styles.fieldFrameFocused, !!error && styles.fieldFrameError]} testID={ids.fieldFrame}>
          {icon && <Icon icon={icon} color={colors.textMuted} />}
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onValueChange}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            editable={!disabled}
            secureTextEntry={isPassword && !revealed}
            keyboardType={spec.keyboardType}
            autoComplete={spec.nativeAutoComplete}
            textContentType={spec.textContentType}
            autoCapitalize={spec.autoCapitalize}
            autoCorrect={kind === 'text'}
            accessibilityLabel={label}
            accessibilityHint={error ?? helper}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              onBlur?.();
            }}
            style={styles.fieldInput}
            testID={ids.fieldInput}
          />
          {isPassword && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={revealed ? 'Ocultar senha' : 'Mostrar senha'}
              accessibilityState={{ checked: revealed, disabled }}
              disabled={disabled}
              hitSlop={TRAILING_HIT_SLOP}
              onPress={() => setRevealed((shown) => !shown)}
              style={styles.toggle}
              testID={ids.toggle}
            >
              <Icon icon={eyeIcon} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>
      {error ? (
        <NativeText accessibilityLiveRegion="polite" style={styles.fieldError} testID={ids.fieldError}>
          {error}
        </NativeText>
      ) : (
        helper && (
          <Text size="sm" tone="muted">
            {helper}
          </Text>
        )
      )}
    </View>
  );
}

export function SearchField({ label, value, onValueChange, disabled = false }: SearchFieldProps) {
  const { colors } = useTheme();
  const { styles, ids } = useSearchStyles();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  const spec = FIELD_KINDS.search;

  return (
    <View style={[styles.fieldRing, focused && styles.fieldRingFocused, disabled && styles.fieldDisabled]} testID={ids.fieldRing}>
      <View style={[styles.fieldFrame, focused && styles.fieldFrameFocused]} testID={ids.fieldFrame}>
        <Icon icon={searchIcon} color={colors.textMuted} />
        <TextInput
          ref={input}
          value={value}
          onChangeText={onValueChange}
          placeholder={label}
          placeholderTextColor={colors.textMuted}
          editable={!disabled}
          keyboardType={spec.keyboardType}
          autoComplete={spec.nativeAutoComplete}
          textContentType={spec.textContentType}
          autoCapitalize={spec.autoCapitalize}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.fieldInput}
          testID={ids.fieldInput}
        />
        {value !== '' && !disabled && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Limpar busca"
            hitSlop={TRAILING_HIT_SLOP}
            onPress={() => {
              onValueChange('');
              input.current?.focus();
            }}
            style={styles.clear}
            testID={ids.clear}
          >
            <Icon icon={closeIcon} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
