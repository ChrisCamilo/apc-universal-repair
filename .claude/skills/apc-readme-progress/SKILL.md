---
name: apc-readme-progress
description: Bring the APC Universal Repair README's progress (Features, Roadmap, Delivery, Status) up to date with the epics on GitHub and the latest release, in English and Portuguese. Use when the user asks to update the APC README, roadmap, progress or status.
---

# Updating the APC README's progress

The README is bilingual: every change goes in the English and the Portuguese half, with the same content.

## 1. Gather the real state

```bash
gh issue list --label epic --state all --json number,title,state
gh api "repos/ChrisCamilo/apc-universal-repair/issues/<epic>/sub_issues?per_page=100" --jq '.[] | "\(.state) #\(.number) \(.title)"'
gh issue list --state open --limit 100
gh release list --limit 3
```

An issue closed as `NOT_PLANNED` (`gh issue view <n> --json stateReason`) is not done: drop it from the open list, don't mark it ✅.

## 2. Compare and update

- **Features:** each area's block with ✅ on what is done, and what is left. An epic missing from the README gets its own block.
- **Roadmap:** one line per epic or phase, `(in progress)` / `✅`; move work out of *Later* when it started.
- **Delivery:** what is done since the MVP and what is still open, with counts of tasks where they help. Don't change the MVP's table.
- **Status:** the current version and what is underway.
- Keep AGENTS.md's epic list in mind; if an epic there is out of date, tell the user rather than editing it unasked.

Make the edits with the Edit tool and check the file keeps CRLF (`file README.md`).

## 3. Commit and open the PR

Branch `docs/readme-update-progress` (or a date suffix). Commits by section, each with both languages, e.g. `docs: List … in the README features`, `docs: Bring the README roadmap up to the epics' state`, `docs: Update the README delivery summary and status to v<x>`. Use the `apc-pr` skill for staging and the PR.
