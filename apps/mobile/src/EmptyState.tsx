import { View, type ViewStyle } from 'react-native';
import { alertIcon, cubeIcon, type IconShape } from '@apc/shared/icons';
import { scales } from '@apc/shared/theme';
import { Button } from './Button';
import { Icon } from './Icon';
import { useTheme } from './theme';
import { Heading, Text } from './Typography';

// What a screen or panel shows when there is nothing to list, or when loading failed, the same as the web:
// an icon, a short title, a line that says what to do next and an optional action, centered. The empty state
// is muted. The error state draws its icon in the danger color and is announced as an alert; its copy says
// what failed and what to do next, with no apologies or vague wording.

const ACTION_STYLE: ViewStyle = { marginTop: scales.space.s2 };
const BOX_STYLE: ViewStyle = {
  alignItems: 'center',
  gap: scales.space.s2,
  paddingHorizontal: scales.space.s4,
  paddingVertical: scales.space.s6,
};
const ICON_SIZE = 40;

type StateMessageProps = {
  /** Icon from @apc/shared/icons; the empty state defaults to the cube and the error state to the alert. */
  icon?: IconShape[];
  /** What is going on, e.g. "Nenhum item cadastrado" or "Não foi possível carregar o estoque". */
  title: string;
  /** What to do next, e.g. "Verifique a conexão com o servidor e tente de novo." */
  message: string;
  /** A button under the message, e.g. "Adicionar item" or "Tentar de novo". */
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ icon = cubeIcon, ...rest }: StateMessageProps) {
  const theme = useTheme();
  return <StateMessage icon={icon} iconColor={theme.colors.textMuted} {...rest} />;
}

export function ErrorState({ icon = alertIcon, ...rest }: StateMessageProps) {
  const theme = useTheme();
  return <StateMessage icon={icon} iconColor={theme.colors.danger} alert {...rest} />;
}

function StateMessage({
  icon,
  iconColor,
  alert = false,
  title,
  message,
  action,
}: StateMessageProps & { icon: IconShape[]; iconColor: string; alert?: boolean }) {
  return (
    <View
      accessibilityRole={alert ? 'alert' : undefined}
      accessibilityLiveRegion={alert ? 'assertive' : undefined}
      style={BOX_STYLE}
    >
      <Icon icon={icon} size={ICON_SIZE} color={iconColor} />
      <Heading level={4} align="center">
        {title}
      </Heading>
      <Text size="sm" tone="muted" align="center">
        {message}
      </Text>
      {action && (
        <View style={ACTION_STYLE}>
          <Button variant="secondary" size="sm" onPress={action.onPress}>
            {action.label}
          </Button>
        </View>
      )}
    </View>
  );
}
