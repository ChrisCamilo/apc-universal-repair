// Semantic design tokens: the single source of truth for every visual style and mode.
// Components never use raw values; web turns these into CSS variables and mobile reads them from the theme context.
// The status colors are danger (red), warn (yellow), success (green) and info (blue), each with the color of what is
// drawn on it (onDanger, onWarn, onSuccess, onInfo): the canvas at night, where they are bright, and white by day.
// By day every style is tinted in its own hue (sand for Anos 80, steel blue for GT4, warm grey-red for BMW 90, sage for
// Fiat 90): the canvas the most, the panels a step lighter and the raised panels another, none of them white, so the
// styles look apart and the screen isn't a sheet of white. The day status colors are dark enough for those tints.

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
  /**
   * Soft accent: the accent color at this opacity, behind chips, tabs, rows and buttons that are on. Stronger by day,
   * where it sits on tinted panels and carries much of the style's color.
   */
  accentSoft: { night: 0.13, day: 0.2 },
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
/** Name of each style as the user menu shows it. */
export const STYLE_LABELS: Record<Style, string> = { eighties: "Anos 80", gt4: "GT4", bmw90: "BMW 90", fiat90: "Fiat 90" };
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
        onWarn: "#0B0C0E",
        success: "#4ADE80",
        onSuccess: "#0B0C0E",
        info: "#60A5FA",
        onInfo: "#0B0C0E",
      },
      glow: { blur: 22, opacity: 0.2 },
      sheen: 0.045,
    },
    day: {
      ...eighties,
      colors: {
        canvas: "#E3D5BA",
        panel: "#EFE5D2",
        panelRaised: "#F6F0E4",
        hairline: "#B9A684",
        text: "#1A1C1F",
        textMuted: "#4F5458",
        accent: "#7F4800",
        onAccent: "#FFFFFF",
        danger: "#A52219",
        onDanger: "#FFFFFF",
        warn: "#6E4D00",
        onWarn: "#FFFFFF",
        success: "#105C2B",
        onSuccess: "#FFFFFF",
        info: "#1A4FA0",
        onInfo: "#FFFFFF",
      },
      glow: { blur: 18, opacity: 0.14 },
      sheen: 0.022,
    },
  },
  // A blue accent, so info is an indigo set well apart from it.
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
        onWarn: "#0E1114",
        success: "#4ADE80",
        onSuccess: "#0E1114",
        info: "#8C9BFF",
        onInfo: "#0E1114",
      },
      sheen: 0.03,
    },
    day: {
      ...gt4,
      colors: {
        canvas: "#CCDAE7",
        panel: "#E0E9F2",
        panelRaised: "#ECF2F8",
        hairline: "#98AEC3",
        text: "#12171B",
        textMuted: "#465260",
        accent: "#165C85",
        onAccent: "#FFFFFF",
        danger: "#A01F15",
        onDanger: "#FFFFFF",
        warn: "#6E4D00",
        onWarn: "#FFFFFF",
        success: "#105C2B",
        onSuccess: "#FFFFFF",
        info: "#3442AE",
        onInfo: "#FFFFFF",
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
        onWarn: "#0A0A0B",
        success: "#4ADE80",
        onSuccess: "#0A0A0B",
        info: "#60A5FA",
        onInfo: "#0A0A0B",
      },
      glow: { blur: 20, opacity: 0.3 },
      sheen: 0.035,
    },
    day: {
      ...bmw90,
      colors: {
        canvas: "#E2D3CD",
        panel: "#EFE4E0",
        panelRaised: "#F6EFEC",
        hairline: "#BCA59C",
        text: "#1A1718",
        textMuted: "#4F4644",
        accent: "#9A3208",
        onAccent: "#FFFFFF",
        danger: "#940F34",
        onDanger: "#FFFFFF",
        warn: "#6E4D00",
        onWarn: "#FFFFFF",
        success: "#105C2B",
        onSuccess: "#FFFFFF",
        info: "#1A4FA0",
        onInfo: "#FFFFFF",
      },
      glow: { blur: 16, opacity: 0.14 },
      sheen: 0.02,
    },
  },
  // The green lighting of a lit instrument panel on green-black. The accent is green, so danger stays red
  // and warn amber, both far from it, and success is a teal green set apart from it.
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
        onWarn: "#070A08",
        success: "#33E6B8",
        onSuccess: "#070A08",
        info: "#60A5FA",
        onInfo: "#070A08",
      },
      glow: { blur: 22, opacity: 0.32 },
      sheen: 0.035,
    },
    day: {
      ...fiat90,
      colors: {
        canvas: "#CCDDCF",
        panel: "#E0EBE2",
        panelRaised: "#ECF3ED",
        hairline: "#98B39F",
        text: "#121A14",
        textMuted: "#45524A",
        accent: "#14652F",
        onAccent: "#FFFFFF",
        danger: "#A52219",
        onDanger: "#FFFFFF",
        warn: "#6E4D00",
        onWarn: "#FFFFFF",
        success: "#065B4C",
        onSuccess: "#FFFFFF",
        info: "#1A4FA0",
        onInfo: "#FFFFFF",
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
  | "warn"
  | "onWarn"
  | "success"
  | "onSuccess"
  | "info"
  | "onInfo";
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
