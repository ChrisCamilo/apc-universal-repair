import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ICON_SIZES, mechanicIcon } from '@apc/shared/icons';
import { Icon } from './Icon';
import { Panel } from './Panel';
import { useTheme } from './theme';
import { Heading, Text } from './Typography';
import { useStyles } from './WorkInProgress.styles';

// A screen still being built, such as a Dashboard tab marked `wip`, the same as the web: its content shows under the
// tint and out of reach (it can't be pressed or read out) behind a notice with a mechanic at work, saying the screen
// isn't ready yet.

type WorkInProgressProps = {
  /** The screen's name, e.g. "Catálogo": "A aba Catálogo ainda não está pronta". */
  label: string;
  /** The screen as it is so far, shown behind the notice. */
  children: ReactNode;
};

export function WorkInProgress({ label, children }: WorkInProgressProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  return (
    <View style={styles.base} testID={ids.base}>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.content}
        testID={ids.content}
      >
        {children}
      </View>
      <View style={styles.overlay} testID={ids.overlay}>
        <Panel style={styles.notice}>
          <View style={styles.illustration} testID={ids.illustration}>
            <Icon icon={mechanicIcon} size={ICON_SIZES.viewer} color={colors.accent} />
          </View>
          <Heading level={3} align="center">{`A aba ${label} ainda não está pronta`}</Heading>
          <Text size="sm" tone="muted" align="center">
            Estamos trabalhando nela. Volte em breve.
          </Text>
        </Panel>
      </View>
    </View>
  );
}
