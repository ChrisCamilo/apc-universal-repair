# CLAUDE.md

This file gives Claude Code operating instructions for **APC Universal Repair**.

## Source of Truth

Commit message convention, branch naming, pull request titles, and the epic structure are all defined in [AGENTS.md](AGENTS.md). Always follow it — do not invent new commit types or branch patterns.

## Critical Rules

- **Never make a single bundled commit.** Split work into multiple commits in logical/execution order, one idea per commit, following the types in AGENTS.md.
- Branch names follow `<type>/<epic-slug>-<short-description>` from AGENTS.md.
- Commit messages are written in English, following `type: Short imperative description`.
- A pull request for an issue is titled `APC-<issue number> - <issue title>` from AGENTS.md.
- The README is bilingual (English/Portuguese). Any change to user-facing content (README, UI copy once built) should keep EN/PT-BR parity.
- Follow the general engineering defaults: no speculative abstractions, no unrequested error handling, reuse existing code before adding new code.

## Shell Scripts and Heredocs

Bash heredocs have broken edits in this repo more than once. Take care with them:

- **No code with escapes or quotes in a heredoc.** A Python or Node script with `\n`, `\r\n` or `\\` in its strings can reach the file with real newlines in their place. A long heredoc with apostrophes (`app's`) has also failed with `unexpected EOF while looking for matching '`. Write the script to a file with the Write tool (in the scratchpad) and run it, or make the change with the Edit tool.
- **Keep the line endings.** Most source files here are CRLF. A script that rewrites a file must read and write it as bytes or keep its line ending. Check `git diff` afterwards for lines that changed only in their endings, or for stray `\r`.
- **Short heredocs are fine** for commit messages and plain text with no backslashes (`git commit -F - <<'EOF'`), always with the quoted `'EOF'` so nothing expands.
- **Look at the result.** After a scripted edit, read the lines it touched, or run the file's tests, before committing.

## Tests made with Playwright's agents

Playwright's MCP (`playwright`) and its test agents (`playwright-test-planner`, `playwright-test-generator` and `playwright-test-healer`, on the `playwright-test` server) are set up in `.mcp.json` and `.claude/agents/` ([docs/testing.md](docs/testing.md#writing-tests-with-playwrights-agents)). A test they make or fix follows the same rules as any other:

- **AGENTS.md "Writing tests":** the `Web:` prefix, the comment above the test, the tags from `TEST_TAGS`, and `test` and `expect` from `e2e/support/fixtures.ts`, starting from the fixtures' state (`signedIn`, `stock`) with every API call answered by a stand-in.
- **Elements through `apps/web/e2e/locators/<scope>.ts`:** the generator records `page.getByRole(…)` calls and a comment before each step. Move the locators into those files, adding the ones that aren't there, and drop the step comments.
- **A failing test is fixed, never weakened.** Never remove or loosen an assertion, and change an expected value only when the app's intended behavior changed. Never add `waitForTimeout`, a longer timeout, `test.fixme()` or a skip to make it pass. When the app is wrong, the test stays failing and the bug is reported.
- **Explore only what the session can vouch for:** the demo (the Pages site, or `site/` served locally), or the web app on an API the session started. Never a server on port 3333 the session didn't start: it may be the installed desktop app, with real data. The test agents start their own servers through the web config, which fails when 3333 is taken.
- **A new file for each test the generator writes:** `generator_write_test` replaces the whole file, so it writes to a new `e2e/<scope>-<behavior>.spec.ts`, never to a spec that exists.
- **Keep a test only if it adds coverage** no other test has, after running it in both projects and the whole suite. A plan in `apps/web/specs/` is kept only with the tests made from it.

## Build / Lint / Test

Tech stack not chosen yet. This section will be filled in once the project is scaffolded (EP-01 `setup`).
