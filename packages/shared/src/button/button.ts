// Button spec shared by the web and mobile buttons, so both platforms offer the same variants and sizes.
// Font sizes are keys of scales.fontSize and paddings keys of scales.space (see ../theme).

/** Sizes: font size step and horizontal/vertical padding steps. "md" is the default, "sm" fits toolbars and panels. */
export const BUTTON_SIZES = {
  md: { fontSize: "sm", padX: "s5", padY: "s3" },
  sm: { fontSize: "xs", padX: "s4", padY: "s2" },
} as const;
/**
 * Variants: primary (accent fill, glow where the style has one), secondary (outline, accent on hover),
 * ghost (no frame, raised surface on hover) and link (inline text action).
 */
export const BUTTON_VARIANTS = ["primary", "secondary", "ghost", "link"] as const;

export type ButtonSize = keyof typeof BUTTON_SIZES;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
