---
name: apc-test
description: Write, fix or review a test in APC Universal Repair - web component (Vitest), web E2E or demo E2E (Playwright), mobile (Jest), desktop or API - following its title prefixes, tags, fixtures and locators. Use for any APC test work, including tests made with Playwright's test agents.
---

# Writing an APC test

Sources of truth: AGENTS.md "Testing" and "Writing tests", CLAUDE.md "Tests made with Playwright's agents", and `docs/testing.md` for running and reports.

## Every test

- A comment right above it: what it checks and why, up to 3 lines.
- Title starts with where it lives: `Web:`, `Mobile:`, `Desktop:`, `API:`, `Shared:`, `Repo:`, also inside a `describe`.
- Runs with reduced motion; a test about motion turns it on for itself.

## Playwright (web, demo, desktop)

- `test` and `expect` from `apps/web/e2e/support/fixtures.ts`, starting from the fixtures' state (`signedIn`, `stock`), every API call answered by a stand-in.
- One area tag plus the kind tags that apply, from `TEST_TAGS` in `@apc/shared/test-tags`. A desktop-only screen is tagged `@desktop-only`, not skipped by project name.
- Elements through `apps/web/e2e/locators/<scope>.ts`: `getByRole` with the name, then `getByLabel`, `getByText`, then `getByTestId` for elements with no role or text. No assertions in locator files.
- Generator output: move its locators into those files and drop its step comments. It writes a new `e2e/<scope>-<behavior>.spec.ts`, never over an existing spec.

## A failing test

Fix it, never weaken it: no removed or looser assertion, no `waitForTimeout`, longer timeout, `fixme` or skip. Change an expected value only when the intended behavior changed. When the app is wrong, leave the test failing and report the bug.

## Before running the web E2E

Port 3333 may be the user's installed desktop app with real data. Only use a server this session started; if 3333 is taken by something else, stop and ask.

## Keep it only if it adds coverage

Run it in both projects (`desktop` 1280×720, `mobile` 360×780) and with the whole suite. A plan in `apps/web/specs/` is kept only with its tests.
