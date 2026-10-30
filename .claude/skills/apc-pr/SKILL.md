---
name: apc-pr
description: Branch, split into commits, push and open the pull request for finished work in APC Universal Repair, following its commit types, branch names and PR titles. Use when APC work is ready to commit, or the user asks to commit, push or open a PR.
---

# Committing and opening an APC pull request

AGENTS.md "Commit Message Convention", "Branch Naming Convention" and "Pull Request Title Convention" are the source of truth.

1. **Branch** off `main` if still on it: `<type>/<epic-slug>-<short-description>`, kebab-case English. Use the `Branch:` line of the issue when it has one.
2. **Split the work** into commits in execution order, one idea each, never one bundled commit. Types: `feat`, `fix`, `refactor`, `dev`, `docs`, `style`, `test`, `perf`, `chore`, `revert`. Message: `type: Short imperative description`, capital letter, no period, English. A README change keeps EN and PT-BR in the same commit.
3. **Stage by file** or with the Edit tool's changes; when one file holds several ideas, stage with a patch that keeps context lines (`git diff > p; git apply --cached p`), never `-U0` hunks, which can land in the wrong place.
4. **Check before each commit:** `git diff --cached` for lines changed only in their endings (most files are CRLF), then the relevant `pnpm lint` / `typecheck` / `test`.
5. **Commit** with a quoted heredoc (`git commit -F - <<'EOF'`), ending with the attribution line the session gives.
6. **Push and open the PR** without asking: title `APC-<issue number> - <issue title>` (issue title as it is), or a plain title when there is no issue. Body: what changed and why, `Closes #<n>`, screenshots for UI or installer pages, and the attribution line.
7. **Never merge** or enable auto-merge unless the user says so.
