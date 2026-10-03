import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { BUTTON_SIZES, type ButtonSize, type ButtonVariant } from '@apc/shared/button';
import type { IconShape } from '@apc/shared/icons';
import { scales } from '@apc/shared/theme';
import { Icon } from './Icon';
import { fontFamily, useTheme, withAlpha, type ActiveTheme } from './theme';

// Actions in the theme's look, the same variants and sizes as the web (see @apc/shared/button). Pressing
// shows what hover shows on the web; a focus ring frames the button when it gets keyboard focus, and
// loading blocks presses and says so.

const DISABLED_OPACITY = 0.5;
const PRESSED_PRIMARY_OPACITY = 0.86;

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon from @apc/shared/icons. */
  icon?: IconShape[];
  /** Shows a spinner, blocks presses and marks the button busy, e.g. while the login is sent. */
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children: string;
};
type VariantColors = { background: string; border: string; label: string };

/**
 * Picks the background, border and label colors of a variant, pressed or not.
 * @param theme Active theme.
 * @param variant Button variant.
 * @param pressed Whether the button is being pressed (the mobile counterpart of hover).
 * @returns Colors from the theme tokens; "transparent" where the variant draws nothing.
 */
function variantColors(theme: ActiveTheme, variant: ButtonVariant, pressed: boolean): VariantColors {
  const { colors } = theme;
  switch (variant) {
    case 'primary':
      return { background: colors.accent, border: 'transparent', label: colors.onAccent };
    case 'secondary':
      return {
        background: 'transparent',
        border: pressed ? colors.accent : colors.hairline,
        label: pressed ? colors.accent : colors.text,
      };
    case 'ghost':
      return { background: pressed ? colors.panelRaised : 'transparent', border: 'transparent', label: colors.text };
    case 'link':
      return { background: 'transparent', border: 'transparent', label: pressed ? colors.accent : colors.textMuted };
  }
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  onPress,
  children,
}: ButtonProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const inactive = disabled || loading;
  const { fontSize: fontStep, padX, padY } = BUTTON_SIZES[size];
  const fontSize = scales.fontSize[fontStep];
  const isLink = variant === 'link';
  const ring: ViewStyle = {
    alignSelf: 'flex-start',
    borderRadius: scales.radiusPill,
    borderWidth: scales.focusRing.width,
    borderColor: focused ? withAlpha(theme.colors.accent, scales.focusRing.opacity) : 'transparent',
  };

  return (
    <View style={ring} testID="button-ring">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: inactive, busy: loading }}
        disabled={inactive}
        focusable
        onPress={onPress}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={({ pressed }) => {
          const colors = variantColors(theme, variant, pressed);
          const glow: ViewStyle =
            variant === 'primary' && theme.glow
              ? {
                  shadowColor: theme.colors.accent,
                  shadowOpacity: theme.glow.opacity,
                  shadowRadius: theme.glow.blur / 2,
                  shadowOffset: { width: 0, height: 0 },
                }
              : {};
          return {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: scales.space.s2,
            borderRadius: scales.radiusPill,
            borderWidth: scales.hairline,
            borderColor: colors.border,
            backgroundColor: colors.background,
            paddingHorizontal: isLink ? 0 : scales.space[padX],
            paddingVertical: isLink ? 0 : scales.space[padY],
            opacity: inactive ? DISABLED_OPACITY : pressed && variant === 'primary' ? PRESSED_PRIMARY_OPACITY : 1,
            transform: [{ translateY: pressed && !inactive ? 1 : 0 }],
            ...glow,
          };
        }}
      >
        {({ pressed }) => {
          const colors = variantColors(theme, variant, pressed);
          const label: TextStyle = isLink
            ? { fontFamily: fontFamily(scales.bodyFont), fontSize, color: colors.label, textDecorationLine: 'underline' }
            : {
                fontFamily: fontFamily(theme.displayFont, 600),
                fontSize,
                letterSpacing: theme.displayTracking * fontSize,
                textTransform: 'uppercase',
                color: colors.label,
              };
          return (
            <>
              {loading ? (
                <ActivityIndicator testID="button-spinner" size="small" color={colors.label} />
              ) : (
                icon && <Icon icon={icon} size={isLink ? 14 : 16} color={colors.label} />
              )}
              <Text style={label}>{children}</Text>
            </>
          );
        }}
      </Pressable>
    </View>
  );
}
