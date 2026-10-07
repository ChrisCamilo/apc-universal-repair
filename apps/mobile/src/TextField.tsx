import { useRef, useState, type ComponentRef, type Ref } from 'react';
import { Pressable, Text as NativeText, TextInput, View, type ReturnKeyTypeOptions } from 'react-native';
import { FIELD_KINDS, type FieldKind } from '@apc/shared/field';
import { closeIcon, eyeIcon, searchIcon, type IconShape } from '@apc/shared/icons';
import { scales } from '@apc/shared/theme';
import { fieldStyle, frameStyles, inputStyle } from './fieldStyles';
import { Icon } from './Icon';
import { fontFamily, useTheme } from './theme';
import { Label, Text } from './Typography';

// The pill-shaped inputs, the same as the web: the frame lights up in the accent with a focus ring while
// focused and in the danger color on error. Each field kind sets the keyboard, autofill hint and
// capitalization (see @apc/shared/field).

const TRAILING_HIT_SLOP = 8;

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
}: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const spec = FIELD_KINDS[kind];
  const isPassword = kind === 'password';
  const { ring, frame } = frameStyles(theme, focused, !!error);

  return (
    <View style={fieldStyle(disabled)}>
      <Label>{label}</Label>
      <View style={ring} testID="field-ring">
        <View style={frame} testID="field-frame">
          {icon && <Icon icon={icon} color={theme.colors.textMuted} />}
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onValueChange}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textMuted}
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
            onBlur={() => setFocused(false)}
            style={inputStyle(theme)}
          />
          {isPassword && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={revealed ? 'Ocultar senha' : 'Mostrar senha'}
              accessibilityState={{ checked: revealed, disabled }}
              disabled={disabled}
              hitSlop={TRAILING_HIT_SLOP}
              onPress={() => setRevealed((shown) => !shown)}
            >
              <Icon icon={eyeIcon} color={theme.colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>
      {error ? (
        <NativeText
          accessibilityLiveRegion="polite"
          style={{ fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.sm, color: theme.colors.danger }}
        >
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
  const theme = useTheme();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  const spec = FIELD_KINDS.search;
  const { ring, frame } = frameStyles(theme, focused, false);

  return (
    <View style={[ring, fieldStyle(disabled)]} testID="field-ring">
      <View style={frame} testID="field-frame">
        <Icon icon={searchIcon} color={theme.colors.textMuted} />
        <TextInput
          ref={input}
          value={value}
          onChangeText={onValueChange}
          placeholder={label}
          placeholderTextColor={theme.colors.textMuted}
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
          style={inputStyle(theme)}
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
          >
            <Icon icon={closeIcon} color={theme.colors.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
