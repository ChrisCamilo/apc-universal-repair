---
name: apc-dependency
description: Add, upgrade or remove a package in APC Universal Repair (pnpm monorepo, web, mobile, desktop, API) with its license audit, notices and architecture docs. Use for any APC dependency change, version bump or new native module.
---

# Changing an APC dependency

AGENTS.md "Licenses" and "Architecture Docs" are the source of truth.

1. **Check the license first.** Only permissive licenses pass (`ALLOWED` in `scripts/licenses.mjs`). Never add GPL, AGPL or SSPL to what ships. Any other license needs an entry in `REVIEWED` explaining why it is fine, in English and Portuguese; ask the user before adding one.
2. **Install** with pnpm in the right package (`pnpm --filter @apc/<pkg> add …`). Prefer what the repo already uses.
3. **A native module in the phone app:** run `./gradlew :app:writeLicenses` in `apps/mobile/android` to refresh `licenses.json`.
4. **Notices:** run `pnpm licenses:write` (on Windows) and commit `THIRD_PARTY_NOTICES.md`, its copy in the phone app's assets and `docs/licenses.md`.
5. **A main technology** added, removed or moved to a new major: update `docs/architecture.md` in both languages, and the README's Tech Stack table in both languages.
6. **Check:** `pnpm licenses:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`.
7. **Commits:** `dev:` for a package added for a feature's tooling, `chore:` for a bump not tied to a feature, `docs:` for the docs; one idea per commit.
