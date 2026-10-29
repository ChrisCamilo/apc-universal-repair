import { Pressable } from 'react-native';
import { backIcon, ICON_SIZES } from '@apc/shared/icons';
import { useStyles } from './BackButton.styles';
import { Icon } from './Icon';
import { useTheme } from './theme';

// The round ← at the left of a screen's title, which goes back to the screen before, the same as the web (see
// BackButton.styles.ts), named for where it goes, e.g. "Voltar ao login".

type BackButtonProps = {
  /** Says where it goes back to, e.g. "Voltar ao login". */
  label: string;
  onPress: () => void;
};

export function BackButton({ label, onPress }: BackButtonProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.round, pressed && styles.roundPressed]}
      testID={ids.round}
    >
      {({ pressed }) => <Icon icon={backIcon} size={ICON_SIZES.prominent} color={pressed ? colors.accent : colors.text} />}
    </Pressable>
  );
}
