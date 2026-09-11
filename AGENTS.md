# AGENTS.md

This file defines the working conventions for **APC Universal Repair**: commit messages, branch naming, and the epic structure used to organize work. It applies to any contributor — human or AI agent.

For the full project description, see [README.md](README.md).

## Project Overview

APC Universal Repair is a catalog of cars organized by brand, letting users browse vehicles, view their spec sheets, and (in a later phase) their 3D model and original assembly/maintenance data (torque, bolt sizes, part codes, diagnostics, reference prices).

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
| EP-04 | `dashboard` | Dashboard shell + tabs/side menu to switch between brands and cars |
| EP-05 | `car-specs` | General vehicle spec sheet display (fuel consumption, equipment/features, etc.) using mocked/static car data |

### Post-MVP epics (deferred, reserved for later)

| Epic ID | Slug | Scope |
|---|---|---|
| EP-06 | `3d-viewer` | Loading, rendering, and interacting with 3D vehicle models |
| EP-07 | `maintenance-specs` | Repair/maintenance ficha técnica: torque values, bolt/screw sizes, original part codes |
| EP-08 | `diagnostics` | Diagnostic guidance for common issues |
| EP-09 | `pricing` | Reference price data & display |
| EP-10 | `backend` | Real authentication + real data persistence, replacing MVP mocks |
| EP-11 | `i18n` | EN/PT-BR parity across the app UI (beyond the README) |

The MVP is scoped to: Setup → Design System → Auth (login) → Dashboard/Navigation → Car Specs. Car data and login are mocked/static for the MVP; 3D viewing, maintenance/repair specs, diagnostics, reference pricing, and a real backend are deferred to post-MVP epics.

## General Contribution Notes

- Keep commits atomic and `main` always deployable.
- Prefer reusing existing components/utilities over introducing new ones.
- Do not add features, abstractions, or error handling beyond what the current task requires.
