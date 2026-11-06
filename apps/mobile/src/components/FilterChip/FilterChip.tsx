import { Pressable, Text, View } from 'react-native';
import { toggleExclusive, toggleValue } from '@apc/shared/filters';
import { useGroupStyles, useStyles } from './FilterChip.styles';

// Toggle chips for quick filters, the same as the web. A chip says whether it is on to screen readers and
// lights up in the accent; pressing shows what hover shows on the web. In a single-choice group, turning
// one chip on turns the others off and pressing the chip that is on turns it off, leaving none selected;
// in a multiple group each chip turns on and off on its own.

type ChipOption = {
  value: string;
  label: string;
  /** Full name for screen readers, for short labels such as "LD". */
  title?: string;
};
type ChipSize = 'md' | 'sm';
type FilterChipGroupProps = {
  /** Accessible name of the group, e.g. "Situação do estoque". */
  label: string;
  options: ChipOption[];
  size?: ChipSize;
} & (
  | { multiple: true; value: string[]; onValueChange: (value: string[]) => void }
  | { multiple?: false; value: string | null; onValueChange: (value: string | null) => void }
);
type FilterChipProps = {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  size?: ChipSize;
  /** Full name for screen readers, when the label is an abbreviation. */
  title?: string;
  children: string;
};

export function FilterChip({ pressed: on, onPressedChange, size = 'md', title, children }: FilterChipProps) {
  const { styles, ids } = useStyles();
  return (
    <Pressable
      accessibilityRole="togglebutton"
      accessibilityLabel={title ?? children}
      accessibilityState={{ checked: on }}
      onPress={() => onPressedChange(!on)}
      style={({ pressed }) => [styles.chip, size === 'sm' ? styles.chipSm : styles.chipMd, pressed && styles.chipPressed, on && styles.chipOn]}
      testID={ids.chip}
    >
      {({ pressed }) => (
        <Text style={[styles.label, pressed && styles.labelPressed, on && styles.labelOn]} testID={ids.label}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

export function FilterChipGroup(props: FilterChipGroupProps) {
  const { label, options, size = 'md' } = props;
  const order = options.map((o) => o.value);
  const { styles, ids } = useGroupStyles();
  return (
    <View role="group" accessibilityLabel={label} style={styles.group} testID={ids.group}>
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
