// Typography spec shared by the web and mobile text components, so both platforms draw the same
// variants. Sizes are keys of scales.fontSize and tones are keys of the theme colors (see ../theme).

/** Heading levels: font size step and weight. Headings use the display face, uppercase. */
export const HEADING_LEVELS = {
  1: { size: "3xl", weight: 700 },
  2: { size: "2xl", weight: 600 },
  3: { size: "xl", weight: 600 },
  4: { size: "lg", weight: 600 },
} as const;
/** Headings use this share of the style's display tracking; labels use all of it. */
export const HEADING_TRACKING = 0.5;
/** Label: the gauge-legend look, small uppercase display face with the full display tracking. */
export const LABEL_TYPE = { size: "xs", weight: 600 } as const;
/** Numeric readout: mono face with tabular figures, for displacement, years and part codes. */
export const READOUT_TYPE = { size: "sm", weight: 500 } as const;
/** Body text sizes, smallest first. */
export const TEXT_SIZES = ["sm", "base", "lg"] as const;
/** Text tones and the theme color each one uses. */
export const TONES = { default: "text", muted: "textMuted", accent: "accent" } as const;

export type HeadingLevel = keyof typeof HEADING_LEVELS;
export type TextSize = (typeof TEXT_SIZES)[number];
export type Tone = keyof typeof TONES;
