# CLAUDE.md

This file gives Claude Code operating instructions for **APC Universal Repair**.

## Source of Truth

Commit message convention, branch naming, and the epic structure are all defined in [AGENTS.md](AGENTS.md). Always follow it — do not invent new commit types or branch patterns.

## Critical Rules

- **Never make a single bundled commit.** Split work into multiple commits in logical/execution order, one idea per commit, following the types in AGENTS.md.
- Branch names follow `<type>/<epic-slug>-<short-description>` from AGENTS.md.
- Commit messages are written in English, following `type: Short imperative description`.
- The README is bilingual (English/Portuguese). Any change to user-facing content (README, UI copy once built) should keep EN/PT-BR parity.
- Follow the general engineering defaults: no speculative abstractions, no unrequested error handling, reuse existing code before adding new code.

## Shell Scripts and Heredocs

Bash heredocs have broken edits in this repo more than once. Take care with them:

- **No code with escapes or quotes in a heredoc.** A Python or Node script with `\n`, `\r\n` or `\\` in its strings can reach the file with real newlines in their place. A long heredoc with apostrophes (`app's`) has also failed with `unexpected EOF while looking for matching '`. Write the script to a file with the Write tool (in the scratchpad) and run it, or make the change with the Edit tool.
- **Keep the line endings.** Most source files here are CRLF. A script that rewrites a file must read and write it as bytes or keep its line ending. Check `git diff` afterwards for lines that changed only in their endings, or for stray `\r`.
- **Short heredocs are fine** for commit messages and plain text with no backslashes (`git commit -F - <<'EOF'`), always with the quoted `'EOF'` so nothing expands.
- **Look at the result.** After a scripted edit, read the lines it touched, or run the file's tests, before committing.

## Build / Lint / Test

Tech stack not chosen yet. This section will be filled in once the project is scaffolded (EP-01 `setup`).
