---
name: apc-publish
description: Generate and publish a new version of APC Universal Repair end to end - prepare it with apc-release, fix whatever fails on the way, merge the PRs once their CI passes and run the Desktop workflow that creates the GitHub release. Use when the user asks to "gerar e publicar uma nova release", or to generate, ship or publish a release in one go.
---

# Generating and publishing an APC release

The user asking to generate and publish a release authorizes this whole flow: the PRs it opens are merged once their CI passes, and the Desktop workflow is run. It is the one exception to "merges wait for the user" and to apc-release's "publishing is the user's". Anything outside it still asks first: an installer test on the user's Windows (apc-installer), deleting a release or a tag, a version the user didn't ask for.

## 1. Prepare

Follow the apc-release skill's steps 1 to 6: the version (a patch unless the user names one or a new area asks for a minor), the branch, the bump, the bilingual notes and the release PR.

Before writing the notes, look over what changed since the last release for anything that breaks an update from it: the installer and its registry, migrations, `config.json`, the bridge between the desktop's main process and its page. A problem found goes in its own PR (step 3), merged before the release PR, and the notes say what the user sees once it is fixed.

## 2. Keep Auto-fix on

Every PR opened here gets Auto-fix right after `gh pr create`:

1. `mcp__ccd_pr__get_status`; when it doesn't report the PR, `mcp__ccd_pr__bind_pr` with its URL.
2. `mcp__ccd_pr__set_monitor` with `auto_fix: true`, `address_comments: true` and the PR's URL.

The app then wakes the session with a `<ci-monitor-event>` on a CI failure, a merge conflict or a review comment. Never poll a PR's checks. On a failure:

- Read the failed job: `gh pr checks <n>` for its link, then `gh run view <run> --job <job> --log-failed`.
- Find the cause before changing anything. A cause in the release itself (a version, the notes) is fixed on the release branch. One in the code or the tooling is fixed as its own commit on the PR's branch, or in its own PR when it is a change of its own.
- Verify the fix locally the way the failing job runs (the same `pnpm turbo run …` command, the same cache state when a cache is involved), then push.
- A failing test is fixed, never weakened (CLAUDE.md): no loosened assertion, no skip, no longer timeout. When the app is wrong, fix the app.

## 3. Fix what turns up

A problem found on the way, a broken update path or a failing check, is fixed in its own PR with the apc-pr skill and tested as its area asks (apc-installer for the installer, apc-test for a test). It gets Auto-fix too (step 2).

## 4. Merge

Merge the fixes first, then the release PR, each once its CI is green:

- `gh pr checks <n>` all pass and `gh pr view <n> --json mergeStateStatus` says `CLEAN`: `gh pr merge <n> --merge`.
- `BEHIND`, since `main` moved: `gh pr update-branch <n>`, and its CI runs again.
- Checks still running: if the repository allows auto-merge, turn it on with `mcp__ccd_pr__set_auto_merge` (`merge_method: "merge"`), which this request authorizes. Otherwise end the turn saying which PR waits on CI, and go on at the user's next message. A green CI wakes nothing.
- After each merge, the PR's issue says `CLOSED` (apc-pr step 8).

## 5. Publish

On an up-to-date `main` with the release PR merged, check that the three `package.json` files say the version and that `docs/releases/v<x.y.z>.md` is there. Then:

```bash
gh workflow run desktop.yml --ref main
gh run list --workflow=desktop.yml --event workflow_dispatch --limit 1 --json databaseId,status,headSha
```

Wait for that run with one `gh run watch <id> --exit-status`, run in the background, so its end wakes the session. This waits on the release workflow, not on a PR's checks.

## 6. When the workflow fails

- Read `gh run view <id> --log-failed`, and find the cause.
- A cause in the code or the tooling is fixed through steps 2 to 4, then the workflow runs again on the new `main`.
- A flaky step, one that passes on a rerun with nothing changed, is still looked into before rerunning with `gh run rerun <id> --failed`. Say what flaked.
- The workflow refuses a version already released. If a broken release `v<x.y.z>` or its tag already exists, never delete it yourself: tell the user what is wrong with it and ask.

## 7. Check the release

`gh release view v<x.y.z> --json name,isLatest,assets,body` should show:

- `APC Universal Repair <x.y.z>`, marked latest;
- the files `APC-Universal-Repair-Setup-<x.y.z>.exe`, its `.blockmap`, `latest.yml`, `APC-Universal-Repair-<x.y.z>-portable.exe` and, with the upload key in the secrets, `apc-universal-repair-<x.y.z>.apk`;
- a body equal to `docs/releases/v<x.y.z>.md`.

Then give the user the release's link, the PRs merged on the way, and what was fixed.
