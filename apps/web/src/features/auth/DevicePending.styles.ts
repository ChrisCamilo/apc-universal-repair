import { recipe, tv } from '../../styles/tv.ts'

// The look of the notice of a device waiting for authorization, above the login or sign-up form: a soft tile with the
// message, the device's short code large in the mono face, spaced to read out, and what to do on the server's
// computer, muted.

/** The notice: its tile, and the code. */
export const devicePending = recipe(
  'auth.device-pending',
  tv({
    slots: {
      base: 'grid gap-2 rounded-tile border border-hairline-soft bg-panel-raised p-4',
      code: 'm-0 font-mono text-2xl tracking-[0.3em] text-text select-all',
    },
  }),
  { base: '', code: 'code' },
)
