import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { scales } from '@apc/shared/theme';
import { menuItemText, useMenu } from './menuContext';
import { fontFamily, useTheme, type ActiveTheme } from './theme';

// A compact single choice, the same as the web, e.g. the theme. The chosen option fills with the accent,
// glowing where the style has a glow. On its own it is a radio group; inside a Menu it becomes a labeled row
// whose options pack tighter, and choosing one keeps the menu open.

const LABEL_STYLE: ViewStyle = { flexShrink: 1 };
const ROW_STYLE: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  columnGap: scales.space.s3,
  rowGap: scales.space.s2,
  paddingHorizontal: scales.space.s2,
  paddingVertical: scales.space.s2,
};

type SegmentedProps = {
  /** Accessible name of the group; inside a menu it is also the row's visible label. */
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
  /** Short explanation under the label, inside a menu. */
  description?: string;
};

/**
 * Styles the pill around the options: hairline frame on the panel.
 * @param theme Active theme.
 * @returns Style for the group View.
 */
function groupStyle(theme: ActiveTheme): ViewStyle {
  return {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: scales.space.s1 / 2,
    padding: scales.space.s1 / 2,
    borderWidth: scales.hairline,
    borderColor: theme.colors.hairline,
    borderRadius: scales.radiusPill,
    backgroundColor: theme.colors.panel,
  };
}

/**
 * Styles an option's label: display face in uppercase, on-accent when chosen, text while pressed, muted otherwise.
 * @param theme Active theme.
 * @param on Whether the option is chosen.
 * @param pressed Whether the option is being pressed.
 * @returns Style for the label Text.
 */
function labelStyle(theme: ActiveTheme, on: boolean, pressed: boolean): TextStyle {
  const fontSize = scales.fontSize.xs;
  const { colors } = theme;
  return {
    fontFamily: fontFamily(theme.displayFont, 600),
    fontSize,
    letterSpacing: theme.displayTracking * fontSize,
    textTransform: 'uppercase',
    color: on ? colors.onAccent : pressed ? colors.text : colors.textMuted,
  };
}

/**
 * Styles an option: a pill filled with the accent and glowing when chosen; tighter inside a menu.
 * @param theme Active theme.
 * @param on Whether the option is chosen.
 * @param inMenu Whether the choice sits in a menu.
 * @returns Style for the option Pressable.
 */
function optionStyle(theme: ActiveTheme, on: boolean, inMenu: boolean): ViewStyle {
  const glow: ViewStyle =
    on && theme.glow
      ? {
          shadowColor: theme.colors.accent,
          shadowOpacity: theme.glow.opacity,
          shadowRadius: theme.glow.blur / 2,
          shadowOffset: { width: 0, height: 0 },
        }
      : {};
  return {
    paddingHorizontal: inMenu ? scales.space.s2 : scales.space.s3,
    paddingVertical: scales.space.s1,
    borderRadius: scales.radiusPill,
    backgroundColor: on ? theme.colors.accent : 'transparent',
    ...glow,
  };
}

export function Segmented({ label, options, value, onValueChange, description }: SegmentedProps) {
  const theme = useTheme();
  const menu = useMenu();
  const group = (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} accessibilityHint={description} style={groupStyle(theme)}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: on }}
            onPress={() => onValueChange(option.value)}
            style={optionStyle(theme, on, menu !== null)}
          >
            {({ pressed }) => <Text style={labelStyle(theme, on, pressed)}>{option.label}</Text>}
          </Pressable>
        );
      })}
    </View>
  );

  if (!menu) {
    return group;
  }
  return (
    <View style={ROW_STYLE}>
      <View style={LABEL_STYLE} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text style={menuItemText(theme, 'label')}>{label}</Text>
        {description && <Text style={menuItemText(theme, 'description')}>{description}</Text>}
      </View>
      {group}
    </View>
  );
}
