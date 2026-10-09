# AGENTS.md

This file defines the working conventions for **APC Universal Repair**: commit messages, branch naming, and the epic structure used to organize work. It applies to any contributor — human or AI agent.

For the full project description, see [README.md](README.md).

## Project Overview

APC Universal Repair is a catalog of cars organized by brand, letting users browse vehicles, view their spec sheets, and (in a later phase) their 3D model and original assembly/maintenance data (torque, bolt sizes, part codes, diagnostics, reference prices). It also includes an item inventory where users manage the parts they keep in stock.

## Commit Message Convention

Format:

```
type: Short imperative description
```

- Lowercase `type`, colon, space, then a short description starting with a capital letter, imperative mood, no trailing period.
- Commit messages are written in **English**, regardless of the language used elsewhere in the project.
- **One logical change per commit.** Never bundle unrelated changes into a single commit — split work into multiple commits, ordered by idea/execution sequence, even within the same feature.

| Type | Use for |
|---|---|
| `feat` | New feature or functionality (new screens, new catalog entries, new car data, new 3D model support, etc.) |
| `fix` | Bug fix of any kind |
| `refactor` | Restructuring existing logic/code without changing external behavior |
| `dev` | Dev tooling: package management, debug code, inline code comments, local scripts/config |
| `docs` | Documentation only (README, AGENTS.md, CLAUDE.md) — not inline code comments (that's `dev`) |
| `style` | Formatting/lint only, no logic change (indentation, naming casing, semicolons) |
| `test` | Adding or updating tests |
| `perf` | Performance improvements |
| `chore` | Repo housekeeping: build/CI config, `.gitignore`, dependency bumps not tied to a feature |
| `revert` | Reverting a previous commit |

Examples:
- `feat: Add brand listing screen`
- `refactor: Replace logic of checkbutton`
- `dev: Add new package React`
- `fix: Fix problematic loop in screen when using UI`
- `docs: Update README with setup instructions`
- `chore: Bump build tooling config`

## Branch Naming Convention

Pattern:

```
<type>/<epic-slug>-<short-description>
```

Same `type` prefixes as commits, kebab-case, English.

Examples:
- `feat/design-system-button-component`
- `feat/auth-login-screen`
- `feat/dashboard-side-menu`
- `feat/car-specs-spec-sheet-view`
- `fix/dashboard-tab-switch-bug`
- `dev/setup-vite-config`
- `docs/readme-update`

For small work with no clear epic, the epic slug may be omitted: `<type>/<short-description>` (e.g. `fix/typo-in-footer`).

`main` is the single long-lived branch and should always stay deployable. Feature branches are created off `main` and merged back once done; there are no long-lived epic branches — that would be over-engineering at this stage.

## Epic Structure

Epics group work by product area and are referenced by their slug in branch names and issue tracking.

### MVP epics (build now)

| Epic ID | Slug | Scope |
|---|---|---|
| EP-01 | `setup` | Project scaffolding, tooling, CI/CD, base config |
| EP-02 | `design-system` | Reusable UI components, theme, colors, typography |
| EP-03 | `auth` | Login screen only — mock/static, no real auth backend yet |
| EP-04 | `dashboard` | Dashboard shell: header, top-level tabs and the user menu. In the MVP the only tab is Inventory; the Catalog tab comes in phase 2 |
| EP-12 | `inventory` | Inventory tab: item list with search by name or part code and filters, add/edit/delete items persisted through the API, up to 3 photos per item (max 3 MB each) and CSV batch import |

### Phase 2 epics (right after the MVP)

| Epic ID | Slug | Scope |
|---|---|---|
| EP-04 | `dashboard` | Catalog tab: side menu to switch between brands and vehicles, model tree, vehicle detail, and catalog search by brand, model or part code |
| EP-05 | `car-specs` | General vehicle spec sheet display (fuel consumption, equipment/features, etc.) using mocked/static car data |

### Later epics (deferred, after phase 2)

| Epic ID | Slug | Scope |
|---|---|---|
| EP-06 | `3d-viewer` | Loading, rendering, and interacting with 3D vehicle models |
| EP-07 | `maintenance-specs` | Repair/maintenance ficha técnica: torque values, bolt/screw sizes, original part codes |
| EP-08 | `diagnostics` | Diagnostic guidance for common issues |
| EP-09 | `pricing` | Reference price data & display |
| EP-10 | `backend` | Real authentication + real data persistence, replacing MVP mocks |
| EP-11 | `i18n` | EN/PT-BR parity across the app UI (beyond the README) |

### Ongoing epics (picked up between feature epics)

| Epic ID | Slug | Scope |
|---|---|---|
| EP-13 | `optimizations` | Refactors that change no behavior: organized, consistent and generic code, such as style recipes beside each component, style ids and shared constants instead of hardcoded values |

The MVP is scoped to: Setup → Design System → Auth (login) → Dashboard → Inventory. Login is mocked/static for the MVP, while inventory items, photos included, are persisted through the API. Phase 2 adds the Catalog tab (EP-04) and Car Specs (EP-05), both on mocked/static vehicle data. 3D viewing, maintenance/repair specs, diagnostics, reference pricing, and a real backend are deferred to later epics.

Tasks that belong to phase 2 end their title with `(phase 2)` and state it in the body: `**Phase:** 2 — together with ...`.

## Task Conventions

Every task (an issue labeled `task`) must have, before work starts:

- **Estimate** in story points, using the Modified Fibonacci scale: `0`, `0.5`, `1`, `2`, `3`, `5`, `8`, `13`, `20`, `40`, `100`. Set it in the `Estimate` field of the [APC Universal Repair project](https://github.com/users/ChrisCamilo/projects/1).
- **Priority** in the project's `Priority` field:
  - `P0`: foundation work that other tasks depend on; the epic cannot start without it.
  - `P1`: required to close the epic.
  - `P2`: comes last in the epic, including phase 2 work.
- **Size** in the project's `Size` field: `XS`, `S`, `M`, `L` or `XL`, a quick read of relative effort that stays consistent with the estimate.
- **Assignee**: `@ChrisCamilo`.
- **Epic reference**: `Part of #<epic>` in the issue body, with the task linked as a sub-issue of that epic.
- **Blockers**: `Blocked by #<task>` in the issue body for every task that must be finished first, also registered as a "blocked by" relationship on GitHub. Omit the line only when nothing blocks the task.

The references go at the end of the issue body:

```
Blocked by #21, #27
Part of #20
```

## Testing

All web tests are written in TypeScript. Each kind of test has one tool:

| Test | Tool | Where |
|---|---|---|
| Component (web) | Vitest Browser Mode, in Chromium through the Playwright provider | Next to the component, `*.test.tsx` |
| End-to-end (web) | Playwright Test, `desktop` (1280×720) and `mobile` (360×780) projects | `apps/web/e2e/*.spec.ts` |
| Mobile | Jest with `react-test-renderer` | `apps/mobile/__tests__/` |

- **Component tests** check one component alone: every style (`eighties`, `gt4`, `bmw90`, `fiat90`) and mode (light, dark), keyboard and focus, and the minimum screen sizes. They run in a real browser, so CSS and tokens apply as they do in the app. Vitest is added by the first Design System task that needs a component test.
- **E2E tests** check a user flow across the app, with the API and the web app running.
- Do not use Playwright's experimental component testing (`@playwright/experimental-ct-react`): its API is not stable and props cross a Node/browser boundary.

### Writing tests

These rules apply to every test, whatever the tool (Playwright, Vitest, Jest, `node:test`).

- **Each test has a short description** in a comment right above it: what it checks and why, up to 3 lines (5 or more only when it really needs it).
- **Each test title starts with where the test lives,** followed by a colon and the behavior in English:

  | Prefix | Tests in |
  |---|---|
  | `Web:` | `apps/web` |
  | `Mobile:` | `apps/mobile` |
  | `API:` | `apps/api` |
  | `Shared:` | `packages/shared` |

  The prefix goes on every `test`/`it` title, also inside a `describe`, so a failing test is identified by its title alone in any report.

```ts
// Switches style and mode on <html> and checks the page picks up that combination's colors and display font.
// Runs for every style and mode, at both screen sizes.
test(`Web: resolves the ${style}/${mode} tokens`, async ({ page }) => {
  // ...
});
```

## Supported Screen Sizes

Sizes are in logical pixels (CSS px on web, dp on mobile), not the physical resolution of the screen.

| Platform | Minimum supported | Design reference |
|---|---|---|
| Desktop (web) | 1280×720 | — |
| Mobile | 360×780 | 390×844 |

- **Desktop, 1280×720:** covers 1366×768 notebooks and 1920×1080 screens at 125% and 150% Windows scaling. At 720 of screen height, the browser and OS bars leave about 600px of usable height, so forms, dialogs and the tutorial must fit in 600px, scrolling inside when needed.
- **Mobile, 360×780:** covers mid-range and premium phones from 2020 on. The 360 width comes from Samsung Galaxy S20–S23 at their default setting; the 780 height from the S22 and S23. Screens are designed at 390×844 (iPhone 12–14) and adapt up and down from there.
- Below the minimum, the app keeps working with its responsive layout, but the layout is not guaranteed.
- The sizes are constants in `@apc/shared/screens` (`MIN_DESKTOP_WIDTH`, `MIN_DESKTOP_HEIGHT`, `MIN_MOBILE_WIDTH`, `MIN_MOBILE_HEIGHT`, `MOBILE_DESIGN_WIDTH`, `MOBILE_DESIGN_HEIGHT`): code, configs, stories and tests import them instead of writing the numbers.
- Every UI task is checked at the minimum sizes before it is done: on web with the Playwright `desktop` (1280×720) and `mobile` (360×780) projects, on mobile with a 360×780 emulator.

## Code Conventions

Applies to every TypeScript/JavaScript file, tests included.

- **Constants right below the imports.** Every module-level `const` (values, lookup tables, regexes, styles, React contexts) sits right after the imports, before any type, function or component, so a file's fixed values are read in one place. `const`s inside a function stay where they are used.
- **Helpers are `function` declarations,** not arrow functions assigned to a `const`, so the block of constants only holds values.
- **Every function is documented** with a JSDoc comment:
  - a short description of what it does, up to 3 lines (5 or more only when it really needs it);
  - `@param` for each argument;
  - `@returns` with what it gives back (left out only when the function returns nothing).
- **Exception:** components that render UI (screens and components such as `App` or `Home`) and providers such as `ThemeProvider` don't need the JSDoc block.
- **Alphabetical order.** Module-level constants are sorted alphabetically by name, ignoring case, and so are functions. Components that render UI and providers are left out of the sorting and come after the functions, in the order that reads best. The one exception: when a constant uses another constant, the one it uses goes first, since JavaScript can't read a `const` before its declaration.
- **File layout:** imports → constants (A–Z) → types → functions (A–Z) → components and providers.
- **Constants and types are blocks.** Consecutive `const` declarations sit on adjacent lines with no blank line between them, and so do `type`/`interface` declarations; a JSDoc comment stays attached to the declaration it describes. One blank line separates the blocks from each other and from the imports, and one blank line separates each function and component.

```ts
const ThemeContext = createContext<ActiveTheme>(defaultTheme);
const WEIGHTS = { 400: 'Regular', 600: 'SemiBold' } as const;

export type ActiveTheme = Theme & { style: Style; mode: Mode };
export type FontWeight = keyof typeof WEIGHTS;
```

```ts
import { scales } from '@apc/shared/theme';

const WEIGHTS = { 400: 'Regular', 600: 'SemiBold' } as const;

/**
 * Names the bundled font file for a family and weight.
 * @param family Font family, e.g. "Barlow Condensed".
 * @param weight Font weight; defaults to 400.
 * @returns File name without extension, e.g. "BarlowCondensed-SemiBold".
 */
export function fontFamily(family: string, weight: keyof typeof WEIGHTS = 400): string {
  return `${family.replace(/\s+/g, '')}-${WEIGHTS[weight]}`;
}
```

## Styles

A component's look lives in a recipe in its own `<Component>.styles.ts`, beside it, never in its JSX (EP-13, #133). Every component on both platforms follows it, and lint fails when one doesn't (see Guards below). `LoginScreen` and `PartResults` are short examples.

### Files

- **One style file per component:** `LoginScreen.tsx` has `LoginScreen.styles.ts` beside it, next to its test and story. A file with several components keeps them all in its one style file: an internal component is a slot of the main one, and each exported component has its own recipe and id (`FilterChip` and `FilterChipGroup`, `Menu` and `MenuItem`).
- **No style of its own, no style file:** a component that only puts design-system components together (`UserMenu`, `DeleteItemDialog`, the web `DashboardLayout`) has no style file.
- **A component drawn by another:** when a component's outer element belongs to another component (a dialog's content inside `Dialog`, the wireframe Dashboard inside `AppFrame`), its recipe's `base` has no classes, and its slots are the elements it draws itself.
- **Shared recipes:** a pattern three or more components repeat goes in `styles/shared.ts` of each app, under the same names on both:
  - Web: `DISPLAY_LABEL` (the display face in uppercase), `FIELD` (a field's frame, border by state, input, end button, list and option) and `menuItem`.
  - Mobile: `displayLabel()`, `fieldStyles()`, `glow()`, `menuItemStyles()` and `roundStyles()` (the × and the photo viewer's arrows).
  - Mobile color helpers that are not a recipe, `withAlpha()` and `softHairline()` (the softer frame of a nested panel or a photo frame), live in `theme.tsx`, so any style file imports them without a cycle.
  - A shared recipe gives classes or styles only. The component puts them in its own recipe (web) or spreads them in its build (mobile), so the elements keep their component's ids.
- **The tools:**
  - Web: `apps/web/src/styles/tv.ts` gives `tv()`, which knows the token classes, and `recipe()`.
  - Mobile: `apps/mobile/src/styles/createStyles.ts` gives `createStyles()`.

### Web: `tv()` and `recipe()`

```ts
// PartResults.styles.ts
export const partResults = recipe(
  'catalog.part-results',
  tv({ slots: { base: 'grid gap-1 rounded-tile …', list: 'grid gap-1', part: […], code: 'font-mono text-xs text-accent' } }),
  { base: '', list: 'list', part: 'list.part', code: 'list.part.line.code' },
)
// PartResults.tsx
const { classes, ids } = partResults()
<div className={classes.base()} data-testid={ids.base}>   // data-testid="catalog.part-results"
```

- **Slots and paths:** a recipe always has slots, `base` being the component's own element. `recipe()` takes each slot's path inside the component. Called with the variants, it gives `classes`, a function per slot returning its classes, and `ids`, each slot's style id. An element writes both out, `className={classes.line()} data-testid={ids.line}`, as mobile writes `style={styles.line} testID={ids.line}`.
- **Variants:** a component's props that change its look (`variant`, `size`, `tone`) are the recipe's variants, under the same names. A caller's `className` goes in through `{ class: className }`, so conflicting classes merge, the last one winning.
- **States:** a state the DOM already shows stays a Tailwind variant in the class (`aria-checked:border-accent`, `hover:`, `focus-visible:`, `disabled:`). A recipe variant is only for state the DOM doesn't carry.
- **A slot that styles another component** passes only its classes, `<Panel className={classes.brand()}>`, so that component's own element keeps its own id.
- **Static classes:** Tailwind only builds the classes it finds written in full, so a class is never put together from a number. A width shared with mobile is written as the token class (`w-36`) here and as the constant there.

### Mobile: `createStyles()`

```ts
// PartResults.styles.ts
export const useStyles = createStyles('catalog.part-results', { box: '', list: 'list', part: 'list.part' }, (theme) => ({
  box: { borderColor: withAlpha(theme.colors.accent, FRAME_OPACITY), … },
  part: { borderColor: 'transparent', … },
  partChosen: { borderColor: theme.colors.accent, backgroundColor: theme.colors.panel },
  partPressed: { backgroundColor: theme.colors.panel },
}))
// PartResults.tsx
const { styles, ids } = useStyles()
<Pressable style={({ pressed }) => [styles.part, pressed && styles.partPressed, chosen && styles.partChosen]} testID={ids.part}>
```

- **Built once per theme:** the styles are built from the theme once per style and mode, kept in a `StyleSheet` and reused, in place of style functions that run on every render.
- **Elements and states:** each element is a key with a path in `slots`, and so an id. A state is a separate key named `<element><State>` (`partChosen`, `partPressed`), added in a style array, with the same state names as the web. A key with no element of its own, such as a ScrollView's `content`, has no path.
- **One `styles` object:** styles that don't depend on the theme go in the same call, so a component has one `styles` object.
- **A slot that styles another component** passes only its style, `<Panel style={styles.brand}>`. That component's view keeps its own id.
- **Values known only at run time** go last in the array, e.g. the menu's place under its trigger: `[styles.popover, { top, right, width }]`.
- **Tests read the styles flattened:** a style is an array now, so a test reads it with `StyleSheet.flatten(node.props.style)`.

### Values

- **Tokens first:** every color, size, space, radius, font and duration comes from the tokens (`@apc/shared/theme`, the Tailwind token classes on web).
- **Named constants:** a value that has a meaning or repeats is a named constant. A constant only one component uses is exported from its style file (`FRAME_OPACITY`, `BADGE_WIDTH`), so its tests import it. One both apps or several components use goes in `@apc/shared`: screen sizes in `screens`, icon sizes in `icons` (`ICON_SIZES`), the table's breakpoint in `table`.
- **Breakpoints:** they have names (`card:`, `max-card:`), built from the shared constants in `tailwind.config.ts`, never `max-[720px]:`.
- **Runtime values only:** the JSX keeps only values known at run time (measured positions, insets, the window's size, `Animated` values). On mobile they go last in the style array, `[styles.card, { top }]`; on web, `style` only takes a style function's result, never an object written in the JSX.
- **Sizes worked out from them:** a size or place computed from a prop or the screen is a function in the style file, called in the JSX with the runtime value: on web `dialogBox(size)`, `viewerBox()`, `frameBox(ratio, style)`, `skeletonBox(shape, width, height)`, `textClamp(lines, style)` and the tour's `spotBox(spot)` and `cardBox(card)`, on mobile `windowBox(size, screen)`, `viewerBox(screen)` and the tour's `dimBoxes(spot, screen)`.

### Style ids

Every styled element carries a style id, in `data-testid` on web and `testID` on mobile: the same string for the same element on both platforms. The recipe gives it along with the styles, so a component never writes one by hand.

- **Format:** `<scope>.<component>[.<slot>…]`, in kebab-case, with a dot for each level. The component is its file's name in kebab-case (`ItemFormDialog` → `item-form-dialog`), and the slots follow how the elements nest inside it, from the outside in. A wrapper that only lays out or places its children (the web login's `layout`, the web combobox's `anchor`, the web tree's open and clip boxes, the web table's `tbody`, the web photo viewer's `footer`) or only draws around them (a mobile field's focus `ring`) has its own id but adds no level to theirs, so an element has the same id on web and mobile even where one platform needs an extra wrapper. Examples: `common.dialog.header.close`, `inventory.item-form-dialog.fields.code`, `catalog.part-results.list.part.line.code`.
- **It names a kind of element, not one instance:** every row of a list shares its id, and tests tell rows apart by text or role. That is why it isn't an HTML `id`.
- **A component inside another keeps its own id:** the × in a dialog is `common.close-button`, inside `common.dialog.header`.
- **Scopes** (`STYLE_SCOPES` in `@apc/shared/style-ids`). The scope follows the area that owns the component, not its folder:

| Scope | Covers | Epic |
|---|---|---|
| `common` | The design system: reusable components that know nothing about items, users or routes (buttons, fields, menus, dialogs, tables, the tour, toasts, typography, the app frame, the brand mark) | EP-02 |
| `auth` | Everything before the session starts: the login screen and its notices | EP-03 |
| `dashboard` | The shell around the tabs: header, tab bar, user menu and the layout that holds the active tab, not what is inside a tab | EP-04 |
| `catalog` | The Catalog tab: brands, model tree, vehicle detail and its search, including the inventory parts a code search finds | EP-04 (phase 2) |
| `inventory` | The Inventory tab: the item list, search, filters, sorting and pagination, the Inventory tutorial and the item dialogs | EP-12 |
| `docs` | Pages that exist only in Storybook | — |

- **Choosing a scope:**
  - **It would work unchanged in another app:** it is `common`. `DataTable` is `common`; `InventoryTab`, which decides an item's columns, is `inventory`.
  - **Several areas use it:** it belongs to the area that owns its data.
  - **An internal, non-exported component:** it is a slot of its file's component (`common.image-viewer.body`).
- **A new area:** a later epic adds its slug to `STYLE_SCOPES` and to this table when its first screen is built (`car-specs`, `3d-viewer`, `maintenance-specs`, `diagnostics`, `pricing`). `common` is the only scope that isn't an epic slug.
- **Probes in tests:** a test may mark an element it renders itself (a probe that shows the theme, two panels to compare) with its own `data-testid` or `testID`. Components never do.

### Guards

`lint` on each app fails when a component breaks these conventions, in CI as well:

- **`lint:styles`** (`@apc/web` and `@apc/mobile`): the guard in `packages/shared/src/styles/styleGuard.ts` reads every component file (the `.tsx` files under `src`, not tests or stories) and lists each place that has:
  - a style id written by hand (`data-testid="…"`, `testID="…"`) instead of the recipe's `ids`;
  - on web, classes written in the JSX (`className="…"`, or a string inside the className's expression; a recipe's variant argument, `classes.nav({ side: 'prev' })`, is fine), a `style={{…}}` object, or an HTML element with classes but no `data-testid`;
  - on mobile, a `style={{…}}` object, or a React Native element (anything imported from a `react-native…` package) with a style but no `testID`.
- **`react-native/no-inline-styles`** is an error in the mobile ESLint, tests included.
- A design-system component styled by a slot (`<Panel className={classes.rail()}>`) needs no id: it keeps its own.

## Architecture Docs

Two visual documents describe the project, with Mermaid diagrams that GitHub renders, in English and Portuguese:

- [`docs/database.md`](docs/database.md): every table, its columns and keys, the relationships between the entities and the rules the schema enforces.
- [`docs/architecture.md`](docs/architecture.md): the apps and packages (`packages/shared`, `apps/web`, `apps/mobile`, `apps/api`), how they depend on and talk to each other, and the technologies each one uses.

Always keep them up to date, **in the same pull request** as the change:

- Changing `apps/api/prisma/schema.prisma` (a table, column, key, relation, enum or delete rule) updates `docs/database.md`.
- Adding, removing or renaming an app, a package or a `@apc/shared` module, changing how the parts talk to each other, or adding, removing or upgrading a main technology (a new major version included) updates `docs/architecture.md`.
- Update the diagrams and both languages together, and check the diagrams still render (Mermaid syntax errors show as an error box on GitHub). Use a `docs:` commit.

## General Contribution Notes

- Keep commits atomic and `main` always deployable.
- Prefer reusing existing components/utilities over introducing new ones.
- Do not add features, abstractions, or error handling beyond what the current task requires.
