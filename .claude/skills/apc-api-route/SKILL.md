---
name: apc-api-route
description: Add, remove or change an API route or the database schema in APC Universal Repair (apps/api), keeping the shared route list, the web demo's stand-in, both Prisma schemas and the docs in step. Use for any APC API, endpoint, response, Prisma model or migration change.
---

# Changing an APC API route or the schema

AGENTS.md "General Contribution Notes" (the demo) and "Architecture Docs" are the source of truth. Everything below goes in the **same pull request** as the change.

## A route or what it answers

1. The route in `apps/api` with its Zod schemas from `packages/shared`.
2. Its entry in `@apc/shared/api-routes` (the list of routes and response schemas).
3. The demo's stand-in in `apps/web/src/demo/demoApi.ts`, answering the same shape.
4. A call for a new route in `apps/web/src/demo/demoRoutes.test.ts`.
5. API tests (`API:` prefix).
6. Run `pnpm test`: `apps/api/src/routes/apiRoutes.test.ts` fails when the routes differ from the list, `demoRoutes.test.ts` when the demo differs or its answers don't parse.
7. Every route but health, login and sign-up needs a live session; keep it that way.

## The schema

1. Change `apps/api/prisma/schema.prisma` (PostgreSQL) and `apps/api/prisma/sqlite/schema.prisma` the same way. Lint fails when their models differ.
2. A migration for each database.
3. Update `docs/database.md` in English and Portuguese, diagram included, and check the Mermaid still renders.

## Architecture

Adding a module, changing how the parts talk, or a new main technology also updates `docs/architecture.md`, both languages.

## Commits

One idea per commit, in order, e.g. `feat:` route, `feat:` demo stand-in, `test:`, `docs:` for the docs.
