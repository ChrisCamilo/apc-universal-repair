import { useState } from 'react';
import { Pressable, ScrollView, Text, View, type ViewStyle } from 'react-native';
import { selectionSummary, toggleValue } from '@apc/shared/filters';
import { checkIcon, chevronIcon } from '@apc/shared/icons';
import { scales } from '@apc/shared/theme';
import { listStyle, OPTION_HEIGHT, optionTextStyle } from './fieldStyles';
import { Icon } from './Icon';
import { useTheme, type ActiveTheme } from './theme';

// A pick-only dropdown, the same as the web: at most SELECT_VISIBLE_OPTIONS options show at once and the
// rest scroll. On a phone the list opens right under the button and pushes what follows down, so it works
// inside panels and sheets without measuring the screen. A multiple choice shows checkboxes and stays open
// while the user picks; the button shows the first choice plus a count ("Freios +2") and screen readers
// hear the full list; "All" clears the choice.

const CHECKBOX_SIZE = 14;
const DISABLED_OPACITY = 0.5;

type Option = { value: string; label: string };
type SelectProps = {
  /** Accessible name, e.g. the row label next to it. */
  label: string;
  options: Option[];
  disabled?: boolean;
} & (
  | {
      multiple: true;
      /** Label of the option that clears the choice, listed first, e.g. "Todas". */
      allLabel: string;
      value: string[];
      onValueChange: (value: string[]) => void;
    }
  | { multiple?: false; value: string; onValueChange: (value: string) => void }
);

/**
 * Draws a multiple-choice checkbox: accent fill when checked, hairline frame otherwise.
 * @param theme Active theme.
 * @param checked Whether the option is chosen.
 * @returns Style for the checkbox View.
 */
function checkboxStyle(theme: ActiveTheme, checked: boolean): ViewStyle {
  const { colors } = theme;
  return {
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: scales.hairline,
    borderColor: checked ? colors.accent : colors.hairline,
    borderRadius: theme.radiusTile / 4,
    backgroundColor: checked ? colors.accent : colors.panel,
  };
}

/**
 * Styles the button: a pill in the text field's frame, lit in the accent while a multiple choice has values.
 * @param theme Active theme.
 * @param lit Whether a value is chosen in a multiple choice.
 * @param disabled Whether the select is disabled.
 * @returns Style for the button Pressable.
 */
function triggerStyle(theme: ActiveTheme, lit: boolean, disabled: boolean): ViewStyle {
  const { colors } = theme;
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scales.space.s2,
    borderWidth: scales.hairline,
    borderColor: lit ? colors.accent : colors.hairline,
    borderRadius: scales.radiusPill,
    backgroundColor: colors.panel,
    paddingHorizontal: scales.space.s3,
    paddingVertical: scales.space.s2,
    opacity: disabled ? DISABLED_OPACITY : 1,
  };
}

export function Select(props: SelectProps) {
  const { label, options, disabled = false } = props;
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  // A multiple choice lists "All" first, with the empty value.
  const items: Option[] = props.multiple ? [{ value: '', label: props.allLabel }, ...options] : options;
  const chosen = props.multiple ? options.filter((o) => props.value.includes(o.value)).map((o) => o.label) : [];
  const shown = props.multiple
    ? selectionSummary(chosen, props.allLabel)
    : (options.find((o) => o.value === props.value)?.label ?? '');

  /** Tells whether an item shows as selected; "All" is selected while nothing else is. */
  const isSelected = (item: Option) =>
    props.multiple ? (item.value ? props.value.includes(item.value) : props.value.length === 0) : item.value === props.value;

  /** Picks an item: a multiple choice toggles it and stays open, a single choice takes it and closes. */
  const pick = (item: Option) => {
    if (props.multiple) {
      props.onValueChange(item.value ? toggleValue(props.value, item.value, options.map((o) => o.value)) : []);
      return;
    }
    props.onValueChange(item.value);
    setOpen(false);
  };

  return (
    <View>
      <Pressable
        accessibilityRole="combobox"
        accessibilityLabel={label}
        accessibilityValue={{ text: props.multiple ? chosen.join(', ') || props.allLabel : shown }}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={() => setOpen((shut) => !shut)}
        style={triggerStyle(theme, props.multiple === true && chosen.length > 0, disabled)}
        testID="select-button"
      >
        <Text numberOfLines={1} style={optionTextStyle(theme, false)}>
          {shown}
        </Text>
        <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
          <Icon icon={chevronIcon} size={12} color={theme.colors.textMuted} />
        </View>
      </Pressable>
      {open && (
        <ScrollView nestedScrollEnabled style={listStyle(theme)} contentContainerStyle={{ padding: scales.space.s1 }}>
          {items.map((item) => {
            const selected = isSelected(item);
            return (
              <Pressable
                key={item.value}
                accessibilityRole={props.multiple ? 'checkbox' : 'radio'}
                accessibilityState={{ checked: selected }}
                onPress={() => pick(item)}
                style={({ pressed }) => ({
                  height: OPTION_HEIGHT,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: scales.space.s2,
                  paddingHorizontal: scales.space.s3,
                  borderRadius: theme.radiusTile,
                  backgroundColor: pressed ? theme.colors.panelRaised : 'transparent',
                })}
              >
                {props.multiple && (
                  <View style={checkboxStyle(theme, selected)}>
                    {selected && <Icon icon={checkIcon} size={10} color={theme.colors.onAccent} />}
                  </View>
                )}
                <Text numberOfLines={1} style={optionTextStyle(theme, selected)}>
                  {item.label}
                </Text>
                {!props.multiple && selected && <Icon icon={checkIcon} size={12} color={theme.colors.accent} />}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
