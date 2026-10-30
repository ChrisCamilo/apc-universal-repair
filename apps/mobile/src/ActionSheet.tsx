import { Pressable, Text, View } from 'react-native';
import { ICON_SIZES, type IconShape } from '@apc/shared/icons';
import { useStyles } from './ActionSheet.styles';
import { BottomSheet } from './BottomSheet';
import { Icon } from './Icon';
import { useTheme } from './theme';

// A phone's list of actions in a bottom sheet, the same as the web, such as the Inventory's "⋯" (the Mais ações
// mockup): a row per action, with its icon and its name. A press closes the sheet and runs the action, which may open a
// dialog of its own.

type Action = { icon: IconShape[]; label: string; onSelect: () => void };
type ActionSheetProps = {
  open: boolean;
  /** Called on a press of an action, the back button, a tap on the backdrop or a drag down; the owner closes the sheet. */
  onClose: () => void;
  title: string;
  actions: Action[];
};

export function ActionSheet({ open, onClose, title, actions }: ActionSheetProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <View style={styles.list} testID={ids.list}>
        {actions.map((action, index) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              action.onSelect();
            }}
            style={({ pressed }) => [styles.action, index === 0 && styles.actionFirst, pressed && styles.actionPressed]}
            testID={ids.action}
          >
            <Icon icon={action.icon} size={ICON_SIZES.dropZone} color={colors.textMuted} />
            <Text style={styles.label} testID={ids.label}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}
