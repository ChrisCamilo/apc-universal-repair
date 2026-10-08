import { Pressable, type ViewStyle } from 'react-native';
import { closeIcon } from '@apc/shared/icons';
import { scales } from '@apc/shared/theme';
import { Icon } from './Icon';
import { useTheme, type ActiveTheme } from './theme';

// The round × that closes a window, such as the photo viewer or a dialog, the same as the web: a hairline ring
// around the icon that turns to the accent while pressed, named "Fechar".

// 36px across, the same as the web, with the hit area grown around it.
const SIZE = scales.space.s6 + scales.space.s1;

type CloseButtonProps = {
  onPress: () => void;
};

/**
 * Styles a round button with a hairline frame: the × and the photo viewer's arrows.
 * @param theme Active theme.
 * @param size Width and height, in px.
 * @param pressed Whether it is being pressed; the frame and the icon then turn to the accent.
 * @returns Style for the button Pressable.
 */
export function roundStyle(theme: ActiveTheme, size: number, pressed: boolean): ViewStyle {
  return {
    width: size,
    height: size,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: scales.hairline,
    borderColor: pressed ? theme.colors.accent : theme.colors.hairline,
    borderRadius: scales.radiusPill,
    backgroundColor: theme.colors.panel,
  };
}

export function CloseButton({ onPress }: CloseButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Fechar"
      hitSlop={scales.space.s1}
      onPress={onPress}
      style={({ pressed }) => roundStyle(theme, SIZE, pressed)}
    >
      {({ pressed }) => <Icon icon={closeIcon} color={pressed ? theme.colors.accent : theme.colors.text} />}
    </Pressable>
  );
}
