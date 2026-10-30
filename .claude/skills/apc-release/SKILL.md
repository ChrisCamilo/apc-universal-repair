---
name: apc-release
description: Prepare a new version of APC Universal Repair (desktop app, API and phone app) for release - bump the versions, write the bilingual release notes and open the release PR. Use when the user asks to release, publish, cut or bump a version of APC.
---

# Preparing an APC release

README "Desktop App → Publishing a version" is the source of truth. Publishing itself is the user's: never run the Desktop workflow or create a GitHub release yourself.

## Steps

1. **Pick the version.** `gh release list --limit 1` gives the latest. Patch for fixes and small features, minor for a new area; ask the user when unsure.
2. **Branch** off an up-to-date `main`: `chore/setup-release-<x-y-z>` (dots as dashes, e.g. `chore/setup-release-0-6-9`).
3. **Collect what changed:** `git log v<last>..main --merges --format='%s'` and each PR's issue. Only changes a user can notice go in the notes.
4. **Bump** `version` to the same value in `apps/desktop/package.json`, `apps/api/package.json` and `apps/mobile/package.json`. The workflow refuses different versions or one already released. Commit: `chore: Bump the desktop app, the API and the phone app to <x.y.z>`.
5. **Write** `docs/releases/v<x.y.z>.md`, English first, then `---`, then Portuguese with the same content (the app's *Sobre esta versão* shows the Portuguese half). Copy the shape of the latest file there:
   - `**Windows:** installed apps update themselves to this version. To install from scratch, download \`APC-Universal-Repair-Setup-<x.y.z>.exe\`, or the portable exe to run without installing.`
   - `### What's new` / `### Novidades` and `### Fixes` / `### Correções`, each bullet a bold one-line summary with its issue number, then what the user sees, in plain words.
   Commit: `docs: Add the release notes of <x.y.z>`.
6. **Push and open the PR,** titled `Release <x.y.z>`, ending with the Claude Code attribution line.
7. **Tell the user the next step:** after merging, run *Actions → Desktop → Run workflow* on `main`, which builds, smoke-tests and creates the release `v<x.y.z>`.

Keep each file's line endings (most are CRLF) and check `git diff` before committing.
