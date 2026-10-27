// What marks the web app's demo: every answer of its API carries it in a header (see demoApi.ts), and the app's own
// build must not hold it anywhere (scripts/check-no-demo.mjs), which is how that build is checked to leave the demo out.

/** The header every answer of the demo's API carries, with DEMO_MARKER. */
export const DEMO_HEADER = 'x-apc-demo'
/** What DEMO_HEADER says; the app's own build must not hold it. */
export const DEMO_MARKER = 'apc-demo-api'
