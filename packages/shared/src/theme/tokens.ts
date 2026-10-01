// Semantic design tokens: the single source of truth for every visual style and mode.
// Components never use raw values; web turns these into CSS variables and mobile reads them from the theme context.

const eighties = {
  displayFont: "Barlow Condensed",
  displayTracking: 0.14,
  radiusPanel: 14,
  radiusTile: 12,
};
const gt4 = {
  displayFont: "Titillium Web",
  displayTracking: 0.08,
  radiusPanel: 6,
  radiusTile: 4,
  glow: null,
};
export const MODES = ["night", "day"] as const;
/** Scales shared by every style. */
export const scales = {
  /** Spacing steps in px. */
  space: { s1: 4, s2: 8, s3: 12, s4: 16, s5: 24, s6: 32, s7: 48, s8: 72 },
  /** Font sizes in px. */
  fontSize: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24, "3xl": 30, "4xl": 36 },
  hairline: 1,
  radiusPill: 999,
  motion: { durationMs: 180, easing: [0.2, 0.6, 0.2, 1] as const },
  /** Focus ring: accent at this opacity, this many px wide. */
  focusRing: { width: 3, opacity: 0.38 },
  bodyFont: "Barlow",
  monoFont: "JetBrains Mono",
} as const;
export const STYLES = ["eighties", "gt4"] as const;
export const themes: Record<Style, Record<Mode, Theme>> = {
  eighties: {
    night: {
      ...eighties,
      colors: {
        canvas: "#0B0C0E",
        panel: "#15171A",
        panelRaised: "#1C1F23",
        hairline: "#3A3F45",
        text: "#E8E6E1",
        textMuted: "#8A9198",
        accent: "#FFA31A",
        onAccent: "#0B0C0E",
      },
      glow: { blur: 22, opacity: 0.2 },
      sheen: 0.045,
    },
    day: {
      ...eighties,
      colors: {
        canvas: "#F4F1EA",
        panel: "#FFFFFF",
        panelRaised: "#FBF9F5",
        hairline: "#D6D0C4",
        text: "#1A1C1F",
        textMuted: "#5F666D",
        accent: "#9A5B00",
        onAccent: "#FFFFFF",
      },
      glow: { blur: 18, opacity: 0.14 },
      sheen: 0.022,
    },
  },
  gt4: {
    night: {
      ...gt4,
      colors: {
        canvas: "#0E1114",
        panel: "#171C21",
        panelRaised: "#1E242A",
        hairline: "#7C8894",
        text: "#EDF1F4",
        textMuted: "#93A1AD",
        accent: "#4FA3D9",
        onAccent: "#0E1114",
      },
      sheen: 0.03,
    },
    day: {
      ...gt4,
      colors: {
        canvas: "#EEF2F5",
        panel: "#FFFFFF",
        panelRaised: "#F7FAFC",
        hairline: "#C3CDD6",
        text: "#12171B",
        textMuted: "#55606A",
        accent: "#1F6F9E",
        onAccent: "#FFFFFF",
      },
      sheen: 0.018,
    },
  },
};

export type Style = (typeof STYLES)[number];
export type Mode = (typeof MODES)[number];
export type ColorToken =
  | "canvas"
  | "panel"
  | "panelRaised"
  | "hairline"
  | "text"
  | "textMuted"
  | "accent"
  | "onAccent";
export interface Theme {
  colors: Record<ColorToken, string>;
  /** Display face family, e.g. "Barlow Condensed". */
  displayFont: string;
  /** Letter spacing of display text, in em. */
  displayTracking: number;
  /** Corner radius in px. */
  radiusPanel: number;
  radiusTile: number;
  /** Glow around active elements: blur in px and accent opacity; null when the style has no glow. */
  glow: { blur: number; opacity: number } | null;
  /** Top-down highlight on panels: white at night, black by day, at this opacity. */
  sheen: number;
}
