import { useRef, useState } from 'react';
import { Pressable, Text as NativeText, TextInput, View, type HostInstance } from 'react-native';
import { ICON_SIZES, minusIcon, plusIcon, type IconShape } from '@apc/shared/icons';
import { useRevealField } from './FieldScrollView';
import { Icon } from './Icon';
import { useStyles } from './Stepper.styles';
import { useTheme } from './theme';
import { Label, Text } from './Typography';

// A whole number between a − and a +, the same as the web, such as an item's minimum stock (see Stepper.styles.ts):
// each press takes one away or adds one, from 0 up to the limit, the − locked at 0 and the + at the limit, and the
// field between them still takes what is typed, which the owner reads. Like the TextField, the hint or the error goes
// under it, and the field is brought into view above the keyboard while typed in.

type StepperProps = {
  label: string;
  /** The number as typed; empty counts as 0. */
  value: string;
  onValueChange: (value: string) => void;
  /** Most the + reaches, e.g. MAX_QUANTITY. */
  max: number;
  /** Hint shown under the field while there is no error. */
  helper?: string;
  /** Error shown under the field in the danger color; marks the field invalid. */
  error?: string;
};

export function Stepper({ label, value, onValueChange, max, helper, error }: StepperProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  const [focused, setFocused] = useState(false);
  const root = useRef<HostInstance>(null);
  const revealField = useRevealField();
  const count = Number(value) || 0;

  /**
   * The − or the +.
   * @param name Its accessible name.
   * @param icon Its icon.
   * @param next The number it sets.
   * @param locked Whether it is locked, at 0 or at the limit.
   */
  const step = (name: string, icon: IconShape[], next: number, locked: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ disabled: locked }}
      disabled={locked}
      onPress={() => onValueChange(String(next))}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, locked && styles.buttonLocked]}
      testID={ids.button}
    >
      {({ pressed }) => <Icon icon={icon} size={ICON_SIZES.prominent} color={pressed ? colors.accent : colors.text} />}
    </Pressable>
  );

  return (
    <View ref={root} style={styles.field} testID={ids.field}>
      <Label>{label}</Label>
      <View style={styles.row} testID={ids.row}>
        {step('Diminuir', minusIcon, count - 1, count <= 0)}
        <TextInput
          value={value}
          onChangeText={onValueChange}
          keyboardType="number-pad"
          accessibilityLabel={label}
          accessibilityHint={error ?? helper}
          onFocus={() => {
            setFocused(true);
            revealField(root.current);
          }}
          onBlur={() => setFocused(false)}
          style={[styles.input, focused && styles.inputFocused, !!error && styles.inputError]}
          testID={ids.input}
        />
        {step('Aumentar', plusIcon, count + 1, count >= max)}
      </View>
      {error ? (
        <NativeText accessibilityLiveRegion="polite" style={styles.error} testID={ids.error}>
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
