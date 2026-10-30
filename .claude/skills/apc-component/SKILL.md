---
name: apc-component
description: Build or change a UI component or screen in APC Universal Repair (apps/web or apps/mobile) following its style recipes, style ids, phone layout and screen-size rules. Use for any APC UI work - a new component, a restyle, a screen laid out for phones.
---

# Building an APC component

Read these AGENTS.md sections before writing code: "Styles" (Files, `tv()`/`recipe()`, `createStyles()`, Values, Style ids, Guards), "Phone layout", "Supported Screen Sizes" and "Code Conventions". Look at `LoginScreen` and `PartResults` on both platforms as short examples.

## Checklist

1. **Reuse first.** Look for a design-system component or a shared recipe (`styles/shared.ts`: web `DISPLAY_LABEL`, `FIELD`, `menuItem`; mobile `displayLabel()`, `fieldStyles()`, `glow()`, `menuItemStyles()`, `roundStyles()`) before adding one.
2. **Scope.** Pick the style-id scope from the table in AGENTS.md (`common` only if it would work unchanged in another app).
3. **Style file beside it:** `<Component>.styles.ts`.
   - Web: `recipe('<scope>.<component>', tv({ slots: { base: … } }), { base: '', … })`, then `className={classes.x()} data-testid={ids.x}`.
   - Mobile: `createStyles('<scope>.<component>', slots, (theme) => ({ … }))`, then `style={styles.x} testID={ids.x}`; states as `<element><State>` keys.
   - Same ids for the same element on web and mobile.
   - No classes, `style={{…}}` or ids written in the JSX; only runtime values, through a style function in the style file.
4. **Values from tokens** (`@apc/shared/theme`); named constants exported from the style file or put in `@apc/shared`; no white by day; overlays open and close in `scales.motion`.
5. **Phone layout** below `card:` on web and always in the native app: page scrolls as a whole, forms full screen, choices in a bottom sheet, 44px touch targets (`scales.touch`), 16px text inputs.
6. **Code layout:** imports → constants (A–Z) → types → functions (A–Z, JSDoc) → components.
7. **Story** in Storybook with its own sample data only (no API, storage or desktop bridge): it is public on GitHub Pages.
8. **Component test** for every style (`eighties`, `gt4`, `bmw90`, `fiat90`) and mode, keyboard and focus, at the minimum sizes; mobile test in `apps/mobile/__tests__/`. Use the `apc-test` skill for the rules.
9. **Check:** `pnpm lint` (includes `lint:styles`), `pnpm typecheck`, `pnpm test`, and the web E2E at 1280×720 and 360×780. Screens that fill the window also at 1360×768 and 1360×689.
