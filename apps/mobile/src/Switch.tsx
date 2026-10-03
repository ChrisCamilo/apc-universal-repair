import { Pressable, Text, View, type ViewStyle } from 'react-native';
import { scales } from '@apc/shared/theme';
import { menuItemStyle, menuItemText, useMenu } from './menuContext';
import { useTheme, withAlpha, type ActiveTheme } from './theme';

// An on/off control, the same as the web: a pill track whose knob slides over to the accent when on,
// glowing where the style has a glow. On its own it is a switch; inside a Menu it becomes a full-width
// checkbox item with a description, and choosing it keeps the menu open. Screen readers hear whether it is on.

const ALONE_STYLE: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: scales.space.s2 };
const DISABLED_OPACITY = 0.5;
const KNOB_INSET = scales.space.s1 / 2;
const KNOB_SIZE = scales.space.s1 * 3.5;
const LABEL_STYLE: ViewStyle = { flex: 1 };
const TRACK_HEIGHT = scales.space.s1 * 5;
const TRACK_WIDTH = scales.space.s1 * 8.5;

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Visible label, which is also the accessible name. */
  children: string;
  /** Short explanation under the label, inside a menu. */
  description?: string;
  disabled?: boolean;
};

/**
 * Styles the knob: muted on the left when off, accent and glowing on the right when on.
 * @param theme Active theme.
 * @param on Whether the switch is on.
 * @returns Style for the knob View.
 */
function knobStyle(theme: ActiveTheme, on: boolean): ViewStyle {
  const { colors } = theme;
  const travel = TRACK_WIDTH - 2 * scales.hairline - 2 * KNOB_INSET - KNOB_SIZE;
  const glow: ViewStyle =
    on && theme.glow
      ? { shadowColor: colors.accent, shadowOpacity: theme.glow.opacity, shadowRadius: theme.glow.blur / 2, shadowOffset: { width: 0, height: 0 } }
      : {};
  return {
    position: 'absolute',
    top: KNOB_INSET,
    left: KNOB_INSET,
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: scales.radiusPill,
    backgroundColor: on ? colors.accent : colors.textMuted,
    transform: [{ translateX: on ? travel : 0 }],
    ...glow,
  };
}

/**
 * Styles the track: raised fill and hairline when off, soft accent and accent border when on.
 * @param theme Active theme.
 * @param on Whether the switch is on.
 * @returns Style for the track View.
 */
function trackStyle(theme: ActiveTheme, on: boolean): ViewStyle {
  const { colors } = theme;
  return {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: scales.radiusPill,
    borderWidth: scales.hairline,
    borderColor: on ? colors.accent : colors.hairline,
    backgroundColor: on ? withAlpha(colors.accent, scales.accentSoft) : colors.panelRaised,
  };
}

export function Switch({ checked, onCheckedChange, children, description, disabled = false }: SwitchProps) {
  const theme = useTheme();
  const menu = useMenu();
  const track = (
    <View style={trackStyle(theme, checked)} testID="switch-track">
      <View style={knobStyle(theme, checked)} testID="switch-knob" />
    </View>
  );

  if (menu) {
    return (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={children}
        accessibilityHint={description}
        accessibilityState={{ checked, disabled }}
        disabled={disabled}
        onPress={() => onCheckedChange(!checked)}
        style={({ pressed }) => menuItemStyle(theme, pressed)}
      >
        <View style={LABEL_STYLE}>
          <Text style={menuItemText(theme, 'label')}>{children}</Text>
          {description && <Text style={menuItemText(theme, 'description')}>{description}</Text>}
        </View>
        {track}
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={children}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onCheckedChange(!checked)}
      style={[ALONE_STYLE, disabled && { opacity: DISABLED_OPACITY }]}
    >
      <Text style={menuItemText(theme, 'label')}>{children}</Text>
      {track}
    </Pressable>
  );
}
