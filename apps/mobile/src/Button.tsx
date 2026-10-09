import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type TextStyle } from 'react-native';
import type { ButtonSize, ButtonVariant } from '@apc/shared/button';
import { ICON_SIZES, type IconShape } from '@apc/shared/icons';
import { useStyles } from './Button.styles';
import { Icon } from './Icon';
import { Spinner } from './Spinner';

// Actions in the theme's look (see Button.styles.ts), the same variants and sizes as the web. Pressing shows what
// hover shows on the web; a focus ring frames the button when it gets keyboard focus, and loading blocks presses
// and says so.

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

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  onPress,
  children,
}: ButtonProps) {
  const { styles, ids } = useStyles();
  const [focused, setFocused] = useState(false);
  const inactive = disabled || loading;
  const isLink = variant === 'link';
  const filled = variant === 'primary' || variant === 'danger';

  /** The frame's styles: its size, its variant and what pressing changes. */
  const frame = (pressed: boolean) => [
    styles.frame,
    isLink ? styles.frameLink : size === 'sm' ? styles.frameSm : styles.frameMd,
    variant === 'primary' && styles.framePrimary,
    variant === 'secondary' && (pressed ? styles.frameSecondaryPressed : styles.frameSecondary),
    variant === 'ghost' && pressed && styles.frameGhostPressed,
    variant === 'danger' && styles.frameDanger,
    pressed && !inactive && styles.framePressed,
    pressed && filled && styles.framePressedFilled,
    inactive && styles.frameDisabled,
  ];

  /** The label's styles: its size and the color of its variant, pressed or not. */
  const label = (pressed: boolean) => [
    styles.label,
    size === 'sm' ? styles.labelSm : styles.labelMd,
    variant === 'primary' && styles.labelPrimary,
    variant === 'secondary' && pressed && styles.labelSecondaryPressed,
    isLink && styles.labelLink,
    isLink && pressed && styles.labelLinkPressed,
    variant === 'danger' && styles.labelDanger,
  ];

  return (
    <View style={[styles.ring, focused && styles.ringFocused]} testID={ids.ring}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: inactive, busy: loading }}
        disabled={inactive}
        focusable
        onPress={onPress}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={({ pressed }) => frame(pressed)}
        testID={ids.frame}
      >
        {({ pressed }) => {
          const color = (StyleSheet.flatten(label(pressed)) as TextStyle).color as string;
          return (
            <>
              {loading ? (
                <Spinner size="sm" color={color} />
              ) : (
                icon && <Icon icon={icon} size={isLink ? ICON_SIZES.inline : ICON_SIZES.body} color={color} />
              )}
              <Text style={label(pressed)} testID={ids.label}>
                {children}
              </Text>
            </>
          );
        }}
      </Pressable>
    </View>
  );
}
