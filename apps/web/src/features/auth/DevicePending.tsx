import { DEVICE_MESSAGES } from '@apc/domain/devices'
import { useMessages } from '../../app/useLocale.ts'
import { Text } from '../../components/Typography'
import { devicePending } from './DevicePending.styles.ts'

// What a login or sign-up from a device the server's computer hasn't authorized shows above its form (see
// useDeviceWait.ts): that the device needs authorizing, its short code, the same the server's computer shows beside
// "Autorizar", and that the notice goes away by itself once it is authorized.

export function DevicePending({ code }: { code: string }) {
  const { classes, ids } = devicePending()
  const messages = useMessages(DEVICE_MESSAGES)
  return (
    <div role="status" className={classes.base()} data-testid={ids.base}>
      <Text>{messages.pending}</Text>
      <p className={classes.code()} data-testid={ids.code}>
        {code}
      </p>
      <Text size="sm" tone="muted">
        {messages.pendingHelp}
      </Text>
    </div>
  )
}
