import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { selectionSummary, toggleValue } from '@apc/shared/filters';
import { checkIcon, chevronIcon, ICON_SIZES } from '@apc/shared/icons';
import { Icon } from './Icon';
import { useStyles } from './Select.styles';
import { useTheme } from './theme';

// A pick-only dropdown, the same as the web: at most SELECT_VISIBLE_OPTIONS options show at once and the
// rest scroll. On a phone the list opens right under the button and pushes what follows down, so it works
// inside panels and sheets without measuring the screen. A multiple choice shows checkboxes and stays open
// while the user picks; the button shows the first choice plus a count ("Freios +2") and screen readers
// hear the full list; "All" clears the choice.

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

export function Select(props: SelectProps) {
  const { label, options, disabled = false } = props;
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
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
        style={[styles.button, props.multiple === true && chosen.length > 0 && styles.buttonPicked, disabled && styles.buttonDisabled]}
        testID={ids.button}
      >
        <Text numberOfLines={1} style={styles.shown} testID={ids.shown}>
          {shown}
        </Text>
        <View style={[styles.chevron, open && styles.chevronOpen]} testID={ids.chevron}>
          <Icon icon={chevronIcon} size={ICON_SIZES.caret} color={colors.textMuted} />
        </View>
      </Pressable>
      {open && (
        <ScrollView nestedScrollEnabled style={styles.fieldList} contentContainerStyle={styles.fieldListContent} testID={ids.fieldList}>
          {items.map((item) => {
            const selected = isSelected(item);
            return (
              <Pressable
                key={item.value}
                accessibilityRole={props.multiple ? 'checkbox' : 'radio'}
                accessibilityState={{ checked: selected }}
                onPress={() => pick(item)}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                testID={ids.option}
              >
                {props.multiple && (
                  <View style={[styles.box, selected && styles.boxChecked]} testID={ids.box}>
                    {selected && <Icon icon={checkIcon} size={ICON_SIZES.mark} color={colors.onAccent} />}
                  </View>
                )}
                <Text numberOfLines={1} style={[styles.optionText, selected && styles.optionTextChosen]} testID={ids.optionText}>
                  {item.label}
                </Text>
                {!props.multiple && selected && <Icon icon={checkIcon} size={ICON_SIZES.caret} color={colors.accent} />}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
