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

## Build / Lint / Test

Tech stack not chosen yet. This section will be filled in once the project is scaffolded (EP-01 `setup`).
