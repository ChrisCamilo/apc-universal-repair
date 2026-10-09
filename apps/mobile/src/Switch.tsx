import { Pressable, Text, View } from 'react-native';
import { useMenu } from './menuContext';
import { useStyles } from './Switch.styles';

// An on/off control, the same as the web (see Switch.styles.ts). On its own it is a switch; inside a Menu it becomes a
// full-width checkbox item with a description, and choosing it keeps the menu open. Screen readers hear whether it is
// on.

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Visible label, which is also the accessible name. */
  children: string;
  /** Short explanation under the label, inside a menu. */
  description?: string;
  disabled?: boolean;
};

export function Switch({ checked, onCheckedChange, children, description, disabled = false }: SwitchProps) {
  const { styles, ids } = useStyles();
  const menu = useMenu();
  const track = (
    <View style={[styles.track, checked && styles.trackOn]} testID={ids.track}>
      <View style={[styles.knob, checked && styles.knobOn]} testID={ids.knob} />
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
        style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
        testID={ids.menuItem}
      >
        <View style={styles.text} testID={ids.text}>
          <Text style={styles.menuItemLabel} testID={ids.menuItemLabel}>
            {children}
          </Text>
          {description && (
            <Text style={styles.menuItemDescription} testID={ids.menuItemDescription}>
              {description}
            </Text>
          )}
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
      style={[styles.alone, disabled && styles.aloneDisabled]}
      testID={ids.alone}
    >
      <Text style={styles.menuItemLabel} testID={ids.menuItemLabel}>
        {children}
      </Text>
      {track}
    </Pressable>
  );
}
