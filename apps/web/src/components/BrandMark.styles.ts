import { recipe, tv } from '../styles/tv.ts'

// The look of the APC mark: its needle, hub and inner rule take the accent and everything else the text colors, so it
// follows the style and mode on <html>. The drawing itself (coordinates, stroke widths and opacities) stays in the SVG,
// as an icon's paths do.

/** The mark: the svg, its frames, the "APC" title, the dial with its ticks, the needle, the hub and the subtitle. */
export const brandMark = recipe(
  'common.brand-mark',
  tv({
    slots: {
      base: '',
      frame: 'stroke-text',
      rule: 'stroke-accent',
      title: 'fill-text font-display text-[48px] font-bold tracking-[0.08em]',
      dial: 'stroke-text',
      tick: 'stroke-text',
      needle: 'stroke-accent',
      hub: 'fill-accent',
      subtitle: 'fill-text-muted font-display text-[11px] tracking-[0.3em]',
    },
  }),
  {
    base: '',
    frame: 'frame',
    rule: 'rule',
    title: 'title',
    dial: 'dial',
    tick: 'dial.tick',
    needle: 'needle',
    hub: 'needle.hub',
    subtitle: 'subtitle',
  },
)
