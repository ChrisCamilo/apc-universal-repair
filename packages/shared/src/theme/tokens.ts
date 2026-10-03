// Semantic design tokens: the single source of truth for every visual style and mode.
// Components never use raw values; web turns these into CSS variables and mobile reads them from the theme context.

const bmw90 = {
  displayFont: "Saira Semi Condensed",
  displayTracking: 0.06,
  radiusPanel: 10,
  radiusTile: 8,
};
const eighties = {
  displayFont: "Barlow Condensed",
  displayTracking: 0.14,
  radiusPanel: 14,
  radiusTile: 12,
};
const fiat90 = {
  displayFont: "Rajdhani",
  displayTracking: 0.1,
  radiusPanel: 12,
  radiusTile: 8,
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
  /** Soft hairline: the hairline color at this opacity, for panel borders and dividers. */
  hairlineSoft: 0.48,
  /** Soft accent: the accent color at this opacity, behind chips and buttons that are on. */
  accentSoft: 0.13,
  /** Status tints behind rows: the warn and danger colors at these opacities, at rest and on hover. */
  statusTint: { warn: 0.15, danger: 0.13, warnHover: 0.24, dangerHover: 0.22 },
  radiusPill: 999,
  motion: { durationMs: 180, easing: [0.2, 0.6, 0.2, 1] as const },
  /** Backdrop behind dialogs: the canvas at this opacity, over a light blur of this many px. */
  backdrop: { opacity: 0.72, blur: 2 },
  /** Shadow under floating lists and menus: black at this opacity, offset down and blurred, in px. */
  popShadow: { offsetY: 14, blur: 32, opacity: 0.28 },
  /** Dim over everything but a guided tour's target: black at this opacity, in every style and mode. */
  spotlightDim: 0.5,
  /** Focus ring: accent at this opacity, this many px wide. */
  focusRing: { width: 3, opacity: 0.38 },
  bodyFont: "Barlow",
  monoFont: "JetBrains Mono",
} as const;
export const STYLES = ["eighties", "gt4", "bmw90", "fiat90"] as const;
/** localStorage (web) and AsyncStorage (mobile) keys of the chosen style and mode. */
export const THEME_STORAGE_KEYS = { style: "apc-style", mode: "apc-mode" } as const;
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
        danger: "#FF6B5E",
        onDanger: "#0B0C0E",
        warn: "#F2C94C",
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
        danger: "#B3261E",
        onDanger: "#FFFFFF",
        warn: "#8A6100",
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
        danger: "#F07A73",
        onDanger: "#0E1114",
        warn: "#E8B04A",
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
        danger: "#B42318",
        onDanger: "#FFFFFF",
        warn: "#8A6100",
      },
      sheen: 0.018,
    },
  },
  // Red-orange lighting on matte black. The accent is already red, so danger is a crimson set well apart from
  // it and warn stays amber.
  bmw90: {
    night: {
      ...bmw90,
      colors: {
        canvas: "#0A0A0B",
        panel: "#141415",
        panelRaised: "#1C1B1C",
        hairline: "#463C3A",
        text: "#F2E9E4",
        textMuted: "#A0918C",
        accent: "#FF5A1F",
        onAccent: "#0A0A0B",
        danger: "#F0364F",
        onDanger: "#0A0A0B",
        warn: "#F2B33D",
      },
      glow: { blur: 20, opacity: 0.3 },
      sheen: 0.035,
    },
    day: {
      ...bmw90,
      colors: {
        canvas: "#F1EEEC",
        panel: "#FFFFFF",
        panelRaised: "#F8F5F4",
        hairline: "#D3CAC6",
        text: "#1A1718",
        textMuted: "#5D5553",
        accent: "#B93E0B",
        onAccent: "#FFFFFF",
        danger: "#A3123A",
        onDanger: "#FFFFFF",
        warn: "#8A6100",
      },
      glow: { blur: 16, opacity: 0.14 },
      sheen: 0.02,
    },
  },
  // The green lighting of a lit instrument panel on green-black. The accent is green, so danger stays red
  // and warn amber, both far from it.
  fiat90: {
    night: {
      ...fiat90,
      colors: {
        canvas: "#070A08",
        panel: "#101511",
        panelRaised: "#161D18",
        hairline: "#33463A",
        text: "#E2EFE5",
        textMuted: "#8AA293",
        accent: "#62E38A",
        onAccent: "#070A08",
        danger: "#FF6B5E",
        onDanger: "#070A08",
        warn: "#F2C94C",
      },
      glow: { blur: 22, opacity: 0.32 },
      sheen: 0.035,
    },
    day: {
      ...fiat90,
      colors: {
        canvas: "#EDF2EE",
        panel: "#FFFFFF",
        panelRaised: "#F5F9F6",
        hairline: "#C5D2C8",
        text: "#121A14",
        textMuted: "#536158",
        accent: "#1C7A3E",
        onAccent: "#FFFFFF",
        danger: "#B3261E",
        onDanger: "#FFFFFF",
        warn: "#8A6100",
      },
      glow: { blur: 16, opacity: 0.14 },
      sheen: 0.02,
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
  | "onAccent"
  | "danger"
  | "onDanger"
  | "warn";
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

/**
 * Tells whether a value, e.g. one read back from storage, is a known mode.
 * @param value Any value.
 * @returns True when the value is "night" or "day".
 */
export function isMode(value: unknown): value is Mode {
  return MODES.includes(value as Mode);
}

/**
 * Tells whether a value, e.g. one read back from storage, is a known style.
 * @param value Any value.
 * @returns True when the value is one of STYLES.
 */
export function isStyle(value: unknown): value is Style {
  return STYLES.includes(value as Style);
}

/**
 * Writes the shadow under floating lists and menus as a CSS box-shadow, which both the web and React Native draw.
 * @returns E.g. "0px 14px 32px rgba(0, 0, 0, 0.28)".
 */
export function popShadow(): string {
  const { offsetY, blur, opacity } = scales.popShadow;
  return `0px ${offsetY}px ${blur}px rgba(0, 0, 0, ${opacity})`;
}

/**
 * Writes a theme's top-down sheen as a CSS gradient, which both the web and React Native draw.
 * @param sheen Opacity of the highlight, from the theme's `sheen`.
 * @param mode Mode the theme belongs to: the highlight is white at night and black by day.
 * @returns A `linear-gradient(...)` that fades out by 45% of the height.
 */
export function sheenGradient(sheen: number, mode: Mode): string {
  const base = mode === "night" ? "255, 255, 255" : "0, 0, 0";
  return `linear-gradient(180deg, rgba(${base}, ${sheen}), transparent 45%)`;
}

/**
 * Writes the dim a guided tour lays over everything but its target, as a CSS color both platforms draw.
 * @returns E.g. "rgba(0, 0, 0, 0.5)".
 */
export function spotlightDim(): string {
  return `rgba(0, 0, 0, ${scales.spotlightDim})`;
}
