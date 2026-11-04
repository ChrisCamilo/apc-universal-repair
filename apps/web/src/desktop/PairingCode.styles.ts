import { recipe, tv } from '../styles/tv.ts'

// The look of the phone's pairing in the Servidor dialog: the QR code beside the address and the code to type, which
// stack on a narrow window. The QR code keeps dark modules on a light ground in either mode, as cameras read it best:
// by day the text color on the canvas, by night the canvas color on the text's, both tinted in the style's hue, never
// white, as the mode on <html> says. The address and the code are in the mono face, picked whole at a click.

/** The pairing: its QR code, with its ground and modules, and the address and code under their terms. */
export const pairingCode = recipe(
  'setup.server-settings.pairing',
  tv({
    slots: {
      base: 'flex flex-wrap items-start gap-4',
      code: 'size-48 shrink-0 rounded-tile bg-canvas [:root[data-mode=night]_&]:bg-text',
      modules: 'fill-text [:root[data-mode=night]_&]:fill-canvas',
      facts: 'm-0 grid min-w-0 flex-1 basis-48 gap-1',
      term: 'font-body text-sm text-text-muted',
      value: 'm-0 font-mono text-base break-all text-text select-all',
    },
  }),
  {
    base: '',
    code: 'code',
    modules: 'code.modules',
    facts: 'facts',
    term: 'facts.term',
    value: 'facts.value',
  },
)
