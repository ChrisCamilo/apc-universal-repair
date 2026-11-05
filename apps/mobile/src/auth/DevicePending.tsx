import { Text as RNText, View } from 'react-native';
import { DEVICE_MESSAGES } from '@apc/shared/devices';
import { Text } from '../Typography';
import { useStyles } from './DevicePending.styles';

// What a login or sign-up from a phone the server's computer hasn't authorized shows above its form (see
// useDeviceWait.ts), as the web's: that the phone needs authorizing, its short code, the same the server's computer
// shows beside "Autorizar", and that the notice goes away by itself once it is authorized.

export function DevicePending({ code }: { code: string }) {
  const { styles, ids } = useStyles();
  return (
    <View accessibilityLiveRegion="polite" style={styles.base} testID={ids.base}>
      <Text>{DEVICE_MESSAGES.pending}</Text>
      <RNText selectable style={styles.code} testID={ids.code}>
        {code}
      </RNText>
      <Text size="sm" tone="muted">
        {DEVICE_MESSAGES.pendingHelp}
      </Text>
    </View>
  );
}
