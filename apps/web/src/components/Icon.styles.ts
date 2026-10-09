import { recipe, tv } from '../styles/tv.ts'

// The look of an icon: its stroke takes the color of the text around it (text-text-muted, text-accent…), so it has
// no classes of its own; the holder may add some, e.g. to turn a chevron.

/** An icon. */
export const icon = recipe('common.icon', tv({ slots: { base: '' } }), { base: '' })
