import { Pressable } from 'react-native';
import { closeIcon } from '@apc/tokens/icons';
import { scales } from '@apc/tokens/theme';
import { useStyles } from './CloseButton.styles';
import { Icon } from '../Icon/Icon';
import { useTheme } from '../../app/theme';
import { COMMON_TEXTS } from '@apc/domain/app-texts';
import { useMessages } from '../../app/locale';

// The round × that closes a window, such as the photo viewer or a dialog, the same as the web (see
// CloseButton.styles.ts), named "Fechar".

type CloseButtonProps = {
  onPress: () => void;
};

export function CloseButton({ onPress }: CloseButtonProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  const common = useMessages(COMMON_TEXTS);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={common.close}
      hitSlop={scales.space.s1}
      onPress={onPress}
      style={({ pressed }) => [styles.round, pressed && styles.roundPressed]}
      testID={ids.round}
    >
      {({ pressed }) => <Icon icon={closeIcon} color={pressed ? colors.accent : colors.text} />}
    </Pressable>
  );
}
