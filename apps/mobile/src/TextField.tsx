import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, Text as NativeText, TextInput, View, type TextStyle, type ViewStyle } from 'react-native';
import { FIELD_KINDS, type FieldKind } from '@apc/shared/field';
import { closeIcon, eyeIcon, searchIcon, type IconShape } from '@apc/shared/icons';
import { scales } from '@apc/shared/theme';
import { Icon } from './Icon';
import { fontFamily, useTheme, type ActiveTheme } from './theme';
import { Label, Text } from './Typography';

// The pill-shaped inputs, the same as the web: the frame lights up in the accent with a focus ring while
// focused and in the danger color on error. Each field kind sets the keyboard, autofill hint and
// capitalization (see @apc/shared/field).

const DISABLED_OPACITY = 0.5;
const TRAILING_HIT_SLOP = 8;

type SearchFieldProps = {
  /** Accessible name; the search shows no visible label, so it is also the placeholder. */
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
};
type TextFieldProps = {
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
};

/**
 * Spaces the label, frame and note of a field, and dims it while disabled.
 * @param disabled Whether the field is disabled.
 * @returns Style for the field's outer view.
 */
function fieldStyle(disabled: boolean): ViewStyle {
  return { gap: scales.space.s1, opacity: disabled ? DISABLED_OPACITY : 1 };
}

/**
 * Builds the pill frame and the focus-ring frame around it.
 * @param theme Active theme.
 * @param focused Whether the input has focus.
 * @param error Whether the field shows an error.
 * @returns Styles for the outer ring and the inner frame.
 */
function frameStyles(theme: ActiveTheme, focused: boolean, error: boolean): { ring: ViewStyle; frame: ViewStyle } {
  const { colors } = theme;
  return {
    ring: {
      borderRadius: scales.radiusPill,
      borderWidth: scales.focusRing.width,
      borderColor: focused ? withAlpha(error ? colors.danger : colors.accent, scales.focusRing.opacity) : 'transparent',
    },
    frame: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scales.space.s2,
      borderRadius: scales.radiusPill,
      borderWidth: scales.hairline,
      borderColor: error ? colors.danger : focused ? colors.accent : colors.hairline,
      backgroundColor: colors.panel,
      paddingHorizontal: scales.space.s4,
      paddingVertical: scales.space.s2,
    },
  };
}

/**
 * Styles the typed text: body face in the text color, filling the frame.
 * @param theme Active theme.
 * @returns Style for the TextInput.
 */
function inputStyle(theme: ActiveTheme): TextStyle {
  return {
    flex: 1,
    minWidth: 0,
    paddingVertical: scales.space.s1,
    fontFamily: fontFamily(scales.bodyFont),
    fontSize: scales.fontSize.base,
    color: theme.colors.text,
  };
}

/**
 * Adds an opacity to a hex token color, for tints such as the focus ring.
 * @param hex Color as `#RRGGBB`.
 * @param opacity Opacity from 0 to 1.
 * @returns The color as `#RRGGBBAA`.
 */
function withAlpha(hex: string, opacity: number): string {
  return hex + Math.round(opacity * 255).toString(16).padStart(2, '0').toUpperCase();
}

export function TextField({
  label,
  value,
  onValueChange,
  kind = 'text',
  icon,
  helper,
  error,
  placeholder,
  disabled = false,
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
            value={value}
            onChangeText={onValueChange}
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
