---
name: apc-release
description: Prepare a new version of APC Universal Repair (desktop app, API and phone app) - bump the versions, write the bilingual release notes and open the release PR - and, when the user asks to generate and publish it ("gerar e publicar uma nova release"), also fix whatever fails, merge the PRs once their CI passes and run the Desktop workflow that creates the GitHub release. Use when the user asks to release, cut, bump, generate or publish a version of APC.
---

# Releasing APC

README "Desktop App → Publishing a version" is the source of truth.

How far to go depends on what the user asked:

- **Prepare** ("faça a release 0.9.3", "prepare a version"): steps 1 to 7. Merging and publishing stay the user's: never merge, run the Desktop workflow or create a GitHub release yourself.
- **Generate and publish** ("gerar e publicar uma nova release"): steps 1 to 6, then "Publishing" below. That request authorizes the whole flow: the PRs it opens are merged once their CI passes, and the Desktop workflow is run. Anything outside it still asks first: an installer test on the user's Windows (apc-installer), deleting a release or a tag, a version the user didn't ask for.

## Preparing

1. **Pick the version.** `gh release list --limit 1` gives the latest. Patch for fixes and small features, minor for a new area; ask the user when unsure, unless they named one.
2. **Branch** off an up-to-date `main`: `chore/setup-release-<x-y-z>` (dots as dashes, e.g. `chore/setup-release-0-6-9`).
3. **Collect what changed:** `git log v<last>..main --merges --format='%s'` and each PR's issue. Only changes a user can notice go in the notes. Look over them for anything that breaks an update from the last release: the installer and its registry, migrations, `config.json`, the bridge between the desktop's main process and its page. A problem found is fixed first, in its own PR with the apc-pr skill, tested as its area asks, and merged before the release PR.
4. **Bump** `version` to the same value in `apps/desktop/package.json`, `apps/api/package.json` and `apps/mobile/package.json`. The workflow refuses different versions or one already released. Commit: `chore: Bump the desktop app, the API and the phone app to <x.y.z>`.
5. **Write** `docs/releases/v<x.y.z>.md`, English first, then `---`, then Portuguese with the same content (the app's *Sobre esta versão* shows the half of the language chosen). The release page shows the file as it is, so it has no bare angle brackets (apc-pr). Copy the shape of the latest file there:
   - `**Windows:** installed apps update themselves to this version. To install from scratch, download \`APC-Universal-Repair-Setup-<x.y.z>.exe\`, or the portable exe to run without installing.`
   - `**Android:** the installed app says when this version is out and opens its APK, \`apc-universal-repair-<x.y.z>.apk\`. To install from scratch, open that file on the phone.` The release carries the APK only when the upload key is in the secrets (the last release's files show it); leave this line out otherwise.
   - `### What's new` / `### Novidades` and `### Fixes` / `### Correções`, each bullet a bold one-line summary with its issue number, then what the user sees, in plain words.
   Commit: `docs: Add the release notes of <x.y.z>`.
6. **Push and open the PR,** titled `Release <x.y.z>`, ending with the Claude Code attribution line, and check it as the apc-pr skill does.
7. **Tell the user the next step:** after merging, run *Actions → Desktop → Run workflow* on `main`, which builds, smoke-tests and creates the release `v<x.y.z>`.

Keep each file's line endings (most are CRLF) and check `git diff` before committing.

## Publishing

Only when the user asked to generate and publish.

### Keep Auto-fix on

Every PR opened here, the release's and each fix's, gets Auto-fix right after `gh pr create`:

1. `mcp__ccd_pr__get_status`; when it doesn't report the PR, `mcp__ccd_pr__bind_pr` with its URL.
2. `mcp__ccd_pr__set_monitor` with `auto_fix: true`, `address_comments: true` and the PR's URL.

The app then wakes the session with a `<ci-monitor-event>` on a CI failure, a merge conflict or a review comment. Never poll a PR's checks. On a failure:

- Read the failed job: `gh pr checks <n>` for its link, then `gh run view <run> --job <job> --log-failed`.
- Find the cause before changing anything. A cause in the release itself (a version, the notes) is fixed on the release branch. One in the code or the tooling is fixed as its own commit on the PR's branch, or in its own PR when it is a change of its own.
- Verify the fix locally the way the failing job runs (the same `pnpm turbo run …` command, the same cache state when a cache is involved), then push.
- A failing test is fixed, never weakened (CLAUDE.md): no loosened assertion, no skip, no longer timeout. When the app is wrong, fix the app.

### Merge

Merge the fixes first, then the release PR, each once its CI is green:

- `gh pr checks <n>` all pass and `gh pr view <n> --json mergeStateStatus` says `CLEAN`: `gh pr merge <n> --merge`.
- `BEHIND`, since `main` moved: `gh pr update-branch <n>`, and its CI runs again.
- Checks still running: if the repository allows auto-merge, turn it on with `mcp__ccd_pr__set_auto_merge` (`merge_method: "merge"`), which this request authorizes. Otherwise end the turn saying which PR waits on CI, and go on at the user's next message. A green CI wakes nothing.
- After each merge, the PR's issue says `CLOSED` (apc-pr).

### Run the Desktop workflow

On an up-to-date `main` with the release PR merged, check that the three `package.json` files say the version and that `docs/releases/v<x.y.z>.md` is there. Then:

```bash
gh workflow run desktop.yml --ref main
gh run list --workflow=desktop.yml --event workflow_dispatch --limit 1 --json databaseId,status,headSha
```

Wait for that run with one `gh run watch <id> --exit-status`, run in the background, so its end wakes the session. This waits on the release workflow, not on a PR's checks.

### When the workflow fails

- Read `gh run view <id> --log-failed`, and find the cause.
- A cause in the code or the tooling is fixed through a PR as above (Auto-fix, merge), then the workflow runs again on the new `main`.
- A flaky step, one that passes on a rerun with nothing changed, is still looked into before rerunning with `gh run rerun <id> --failed`. Say what flaked.
- The workflow refuses a version already released. If a broken release `v<x.y.z>` or its tag already exists, never delete it yourself: tell the user what is wrong with it and ask.

### Check the release

`gh release view v<x.y.z> --json name,isLatest,assets,body` should show:

- `APC Universal Repair <x.y.z>`, marked latest;
- the files `APC-Universal-Repair-Setup-<x.y.z>.exe`, its `.blockmap`, `latest.yml`, `APC-Universal-Repair-<x.y.z>-portable.exe` and, with the upload key in the secrets, `apc-universal-repair-<x.y.z>.apk`;
- a body equal to `docs/releases/v<x.y.z>.md`.

Then give the user the release's link, the PRs merged on the way, and what was fixed.
