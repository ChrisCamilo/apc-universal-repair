import { Pressable } from 'react-native';
import { closeIcon } from '@apc/shared/icons';
import { scales } from '@apc/shared/theme';
import { useStyles } from './CloseButton.styles';
import { Icon } from './Icon';
import { useTheme } from './theme';

// The round × that closes a window, such as the photo viewer or a dialog, the same as the web (see
// CloseButton.styles.ts), named "Fechar".

type CloseButtonProps = {
  onPress: () => void;
};

export function CloseButton({ onPress }: CloseButtonProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Fechar"
      hitSlop={scales.space.s1}
      onPress={onPress}
      style={({ pressed }) => [styles.round, pressed && styles.roundPressed]}
      testID={ids.round}
    >
      {({ pressed }) => <Icon icon={closeIcon} color={pressed ? colors.accent : colors.text} />}
    </Pressable>
  );
}
