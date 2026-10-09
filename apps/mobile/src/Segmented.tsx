import { Pressable, Text, View } from 'react-native';
import { useMenu } from './menuContext';
import { useStyles } from './Segmented.styles';

// A compact single choice, the same as the web (see Segmented.styles.ts), e.g. the theme. On its own it is a radio
// group; inside a Menu it becomes a labeled row whose options pack tighter, and choosing one keeps the menu open.

type SegmentedProps = {
  /** Accessible name of the group; inside a menu it is also the row's visible label. */
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
  /** Short explanation under the label, inside a menu. */
  description?: string;
};

export function Segmented({ label, options, value, onValueChange, description }: SegmentedProps) {
  const { styles, ids } = useStyles();
  const menu = useMenu();
  const group = (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} accessibilityHint={description} style={styles.group} testID={ids.group}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: on }}
            onPress={() => onValueChange(option.value)}
            style={[styles.option, menu !== null && styles.optionInMenu, on && styles.optionOn]}
            testID={ids.option}
          >
            {({ pressed }) => (
              <Text style={[styles.optionLabel, pressed && styles.optionLabelPressed, on && styles.optionLabelOn]} testID={ids.optionLabel}>
                {option.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  if (!menu) {
    return group;
  }
  return (
    <View style={styles.row} testID={ids.row}>
      <View style={styles.text} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden testID={ids.text}>
        <Text style={styles.menuItemLabel} testID={ids.menuItemLabel}>
          {label}
        </Text>
        {description && (
          <Text style={styles.menuItemDescription} testID={ids.menuItemDescription}>
            {description}
          </Text>
        )}
      </View>
      {group}
    </View>
  );
}
