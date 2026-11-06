import { DEVICE_MESSAGES } from '@apc/shared/devices'
import { Text } from '../../ui/Typography'
import { devicePending } from './DevicePending.styles.ts'

// What a login or sign-up from a device the server's computer hasn't authorized shows above its form (see
// useDeviceWait.ts): that the device needs authorizing, its short code, the same the server's computer shows beside
// "Autorizar", and that the notice goes away by itself once it is authorized.

export function DevicePending({ code }: { code: string }) {
  const { classes, ids } = devicePending()
  return (
    <div role="status" className={classes.base()} data-testid={ids.base}>
      <Text>{DEVICE_MESSAGES.pending}</Text>
      <p className={classes.code()} data-testid={ids.code}>
        {code}
      </p>
      <Text size="sm" tone="muted">
        {DEVICE_MESSAGES.pendingHelp}
      </Text>
    </div>
  )
}
