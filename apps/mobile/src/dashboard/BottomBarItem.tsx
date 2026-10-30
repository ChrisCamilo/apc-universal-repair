import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useBarStyles } from './Dashboard.styles';

// An entry of the Dashboard's bottom bar that isn't a tab, such as Alertas or Conta, the same as the web: a button with
// its picture in the pill over its label, the same as the tabs beside it (see Dashboard.styles.ts). It opens what it
// names; its owner holds what opens.

type BottomBarItemProps = {
  /** The label under the pill, e.g. "Alertas". */
  label: string;
  /** The accessible name, when the label alone doesn't say enough, e.g. "Alertas, 2 não lidas". */
  name?: string;
  /** Whether what it opens (a sheet or a full screen) is open, for screen readers. */
  expanded: boolean;
  onPress: () => void;
  /** The picture in the pill, e.g. the bell with its badge. */
  children: ReactNode;
};

export function BottomBarItem({ label, name, expanded, onPress, children }: BottomBarItemProps) {
  const { styles, ids } = useBarStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name ?? label}
      accessibilityState={{ expanded }}
      onPress={onPress}
      style={styles.item}
      testID={ids.item}
    >
      {({ pressed }) => (
        <>
          <View style={styles.pill} testID={ids.pill}>
            {children}
          </View>
          <Text numberOfLines={1} style={[styles.label, pressed && styles.labelPressed]} testID={ids.label}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
