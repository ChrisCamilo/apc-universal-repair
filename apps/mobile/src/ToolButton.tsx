import { Pressable, View } from 'react-native';
import { ICON_SIZES, type IconShape } from '@apc/shared/icons';
import { Icon } from './Icon';
import { useTheme } from './theme';
import { useStyles } from './ToolButton.styles';

// A round icon button of a phone's toolbar, the same as the web, such as the Inventory's Filtros and Ordenar, which
// open a bottom sheet. It has no text of its own, so its label names it, and says what is on, e.g. "Filtros, 1 ativo";
// while something is on it is drawn in the accent, with a dot (see ToolButton.styles.ts).

type ToolButtonProps = {
  icon: IconShape[];
  /** Accessible name, e.g. "Ordenar, Local (A → Z)". */
  label: string;
  /** Whether what it opens is on, e.g. a filter or a sort. */
  active?: boolean;
  /** Whether what it opens is open. */
  expanded?: boolean;
  onPress: () => void;
};

export function ToolButton({ icon, label, active = false, expanded = false, onPress }: ToolButtonProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded }}
      onPress={onPress}
      style={({ pressed }) => [styles.round, active && styles.roundActive, pressed && styles.roundPressed]}
      testID={ids.round}
    >
      <Icon icon={icon} size={ICON_SIZES.thumbnail} color={active ? colors.accent : colors.text} />
      {active && <View style={styles.dot} testID={ids.dot} />}
    </Pressable>
  );
}
