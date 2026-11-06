// The tags of the Playwright tests, web, demo and desktop, so a typo in one doesn't compile. Every test has one area
// tag, the style-id scope it covers, and the kind tags that apply; `playwright test --grep @inventory` runs a subset.
// Not for the app itself.

export const TEST_TAGS = {
  // The areas, after the style-id scopes.
  auth: "@auth",
  dashboard: "@dashboard",
  catalog: "@catalog",
  inventory: "@inventory",
  notifications: "@notifications",
  setup: "@setup",
  // The kinds.
  /** The flows a release needs: the login, the Inventory's list, creating and editing an item, the desktop's sign-in. */
  smoke: "@smoke",
  /** Sizes and scrolling. */
  layout: "@layout",
  /** The styles and modes. */
  theme: "@theme",
  /** A motion, with reduced motion off. */
  motion: "@motion",
  /** The web app's demo, as GitHub Pages serves it. */
  demo: "@demo",
  /** The desktop app with the server it ships, much slower than with the stand-in API. */
  bundled: "@bundled",
  /** A desktop screen only: the web's mobile project leaves it out. */
  desktopOnly: "@desktop-only",
  /** A phone screen only, such as the Dashboard's bottom bar: the web's desktop project leaves it out. */
  mobileOnly: "@mobile-only",
} as const;

/** One of the tests' tags. */
export type TestTag = (typeof TEST_TAGS)[keyof typeof TEST_TAGS];
