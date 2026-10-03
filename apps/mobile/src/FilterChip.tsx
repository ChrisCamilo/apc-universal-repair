import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { toggleExclusive, toggleValue } from '@apc/shared/filters';
import { scales } from '@apc/shared/theme';
import { softHairline } from './Panel';
import { fontFamily, useTheme, withAlpha, type ActiveTheme } from './theme';

// Toggle chips for quick filters, the same as the web. A chip says whether it is on to screen readers and
// lights up in the accent; pressing shows what hover shows on the web. In a single-choice group, turning
// one chip on turns the others off and pressing the chip that is on turns it off, leaving none selected;
// in a multiple group each chip turns on and off on its own.

const GROUP_STYLE: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', gap: scales.space.s2 };
const PADDING = {
  md: { paddingHorizontal: scales.space.s3, paddingVertical: scales.space.s1 },
  sm: { paddingHorizontal: scales.space.s2, paddingVertical: scales.space.s1 / 2 },
};

type ChipOption = {
  value: string;
  label: string;
  /** Full name for screen readers, for short labels such as "LD". */
  title?: string;
};
type FilterChipGroupProps = {
  /** Accessible name of the group, e.g. "Situação do estoque". */
  label: string;
  options: ChipOption[];
  size?: keyof typeof PADDING;
} & (
  | { multiple: true; value: string[]; onValueChange: (value: string[]) => void }
  | { multiple?: false; value: string | null; onValueChange: (value: string | null) => void }
);
type FilterChipProps = {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  size?: keyof typeof PADDING;
  /** Full name for screen readers, when the label is an abbreviation. */
  title?: string;
  children: string;
};

/**
 * Styles a chip's frame: soft border when off, accent border on a soft accent fill when on.
 * @param theme Active theme.
 * @param on Whether the chip is on.
 * @param pressed Whether the chip is being pressed (the mobile counterpart of hover).
 * @param size Chip size.
 * @returns Style for the chip Pressable.
 */
function chipStyle(theme: ActiveTheme, on: boolean, pressed: boolean, size: keyof typeof PADDING): ViewStyle {
  const { colors } = theme;
  return {
    ...PADDING[size],
    borderWidth: scales.hairline,
    borderColor: on ? colors.accent : pressed ? colors.hairline : softHairline(theme),
    borderRadius: scales.radiusPill,
    backgroundColor: on ? withAlpha(colors.accent, scales.accentSoft) : 'transparent',
  };
}

/**
 * Styles a chip's label: display face in uppercase, accent when on, text while pressed, muted otherwise.
 * @param theme Active theme.
 * @param on Whether the chip is on.
 * @param pressed Whether the chip is being pressed.
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
    color: on ? colors.accent : pressed ? colors.text : colors.textMuted,
  };
}

export function FilterChip({ pressed: on, onPressedChange, size = 'md', title, children }: FilterChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="togglebutton"
      accessibilityLabel={title ?? children}
      accessibilityState={{ checked: on }}
      onPress={() => onPressedChange(!on)}
      style={({ pressed }) => chipStyle(theme, on, pressed, size)}
    >
      {({ pressed }) => <Text style={labelStyle(theme, on, pressed)}>{children}</Text>}
    </Pressable>
  );
}

export function FilterChipGroup(props: FilterChipGroupProps) {
  const { label, options, size = 'md' } = props;
  const order = options.map((o) => o.value);
  return (
    <View role="group" accessibilityLabel={label} style={GROUP_STYLE}>
      {options.map((option) => (
        <FilterChip
          key={option.value}
          size={size}
          title={option.title}
          pressed={props.multiple ? props.value.includes(option.value) : props.value === option.value}
          onPressedChange={() =>
            props.multiple
              ? props.onValueChange(toggleValue(props.value, option.value, order))
              : props.onValueChange(toggleExclusive(props.value, option.value))
          }
        >
          {option.label}
        </FilterChip>
      ))}
    </View>
  );
}
