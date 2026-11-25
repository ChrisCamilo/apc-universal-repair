import { Text as RNText, View } from 'react-native';
import { DEVICE_MESSAGES } from '@apc/domain/devices';
import { useMessages } from '../../app/locale';
import { Text } from '../../components/Typography';
import { useStyles } from './DevicePending.styles';

// What a login or sign-up from a phone the server's computer hasn't authorized shows above its form (see
// useDeviceWait.ts), as the web's: that the phone needs authorizing, its short code, the same the server's computer
// shows beside "Autorizar", and that the notice goes away by itself once it is authorized.

export function DevicePending({ code }: { code: string }) {
  const { styles, ids } = useStyles();
  const messages = useMessages(DEVICE_MESSAGES);
  return (
    <View accessibilityLiveRegion="polite" style={styles.base} testID={ids.base}>
      <Text>{messages.pending}</Text>
      <RNText selectable style={styles.code} testID={ids.code}>
        {code}
      </RNText>
      <Text size="sm" tone="muted">
        {messages.pendingHelp}
      </Text>
    </View>
  );
}
