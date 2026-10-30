---
name: apc-task
description: Create or fill in a task or epic issue in the APC Universal Repair repository (ChrisCamilo/apc-universal-repair), with its estimate, priority, size, epic and blockers. Use when the user asks to open, write, plan or split a task, issue or epic for APC.
---

# Creating an APC task

AGENTS.md ("Epic Structure" and "Task Conventions") is the source of truth. Read it first; this skill is the procedure.

## 1. Draft the issue and show it to the user

Never create the issue before the user approves the draft. The draft has:

- **Title:** English, imperative, no type prefix ("Show an item's details as a full screen on phones"). A phase 2 task ends with ` (phase 2)`, a phase 3 one with ` (phase 3)`.
- **Body,** in this order:
  1. One paragraph on the problem as the user sees it today.
  2. `### Deliverables`: what changes, as bullets, and what must not change (e.g. "The desktop details do not change").
  3. `### Tests`: which suites and files cover it (web E2E spec and project, component test, mobile test).
  4. `### Definition of Done`: a `- [ ]` checklist.
  5. `**Phase:** 2 — together with ...` for phase tasks.
  6. `Branch: \`<type>/<epic-slug>-<short-description>\``.
  7. The references, last: `Blocked by #a, #b` (omit when nothing blocks it), then `Part of #<epic>`.
- **Labels:** `task` and the epic's area label (`setup`, `design-system`, `auth`, `dashboard`, `inventory`, `notifications`, `backend`, `optimizations`, `qa`, `mobile`). An epic gets `epic` and its area.
- **Fields to propose:** Estimate (`0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100`), Priority (`P0` foundation, `P1` closes the epic, `P2` last), Size (`XS`–`XL`, consistent with the estimate).

Find the epic and possible blockers first:

```bash
gh issue list --label epic --state all
gh api "repos/ChrisCamilo/apc-universal-repair/issues/<epic>/sub_issues?per_page=100" --jq '.[] | "\(.state) #\(.number) \(.title)"'
```

## 2. Create it and wire it up

```bash
gh issue create --title "<title>" --body-file <file> --label task --label <area> --assignee ChrisCamilo
```

The sub-issue and "blocked by" APIs take the issue's numeric `id`, not its number:

```bash
id=$(gh api repos/ChrisCamilo/apc-universal-repair/issues/<n> --jq .id)
gh api -X POST repos/ChrisCamilo/apc-universal-repair/issues/<epic>/sub_issues -F sub_issue_id=$id
blocker=$(gh api repos/ChrisCamilo/apc-universal-repair/issues/<blocker> --jq .id)
gh api -X POST repos/ChrisCamilo/apc-universal-repair/issues/<n>/dependencies/blocked_by -F issue_id=$blocker
```

## 3. Set the project fields

The project is `https://github.com/users/ChrisCamilo/projects/1`.

```bash
gh project item-add 1 --owner ChrisCamilo --url <issue url> --format json --jq .id   # item id
gh project view 1 --owner ChrisCamilo --format json --jq .id                         # project id
gh project field-list 1 --owner ChrisCamilo --format json                            # field and option ids
gh project item-edit --project-id <p> --id <item> --field-id <Estimate> --number 3
gh project item-edit --project-id <p> --id <item> --field-id <Priority> --single-select-option-id <P1>
gh project item-edit --project-id <p> --id <item> --field-id <Size> --single-select-option-id <M>
```

Report the issue's link and the values set.
