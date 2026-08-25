# Storycrat Living Issue Log

Append-only. Newest entries at the bottom. Never delete entries.

## Issue #1 — npm peer-dependency conflict on initial install
**Date:** 2026-08-23
**Task:** 1.1 Initialize Cloudflare Workers project
**Severity:** Low

**Problem:** `npm install` failed with ERESOLVE: `wrangler@4.x` requires `@cloudflare/workers-types@^5`, while `package.json` pinned `^4`.
**Root Cause:** Stale major-version assumption in hand-written dependency pins.
**Resolution:** Aligned `@cloudflare/workers-types` to v5 (`5.20260823.1`) alongside latest wrangler.
**Files Affected:** `package.json`
**Prevention Note:** Let npm resolve workers-types/wrangler majors together rather than pinning them from memory.

## Issue #2 — vitest-pool-workers 0.22 removed the `/config` export
**Date:** 2026-08-23
**Task:** 1.1 Initialize Cloudflare Workers project
**Severity:** Medium

**Problem:** After upgrading to `@cloudflare/vitest-pool-workers@0.22` (needed so the test runtime supports the configured compatibility date), tests failed at startup: `Missing "./config" specifier in "@cloudflare/vitest-pool-workers" package`.
**Root Cause:** The 0.22 release replaced `defineWorkersConfig` / `defineWorkersProject` from `@cloudflare/vitest-pool-workers/config` with a Vite plugin (`cloudflareTest`) requiring vitest 4.
**Resolution:** Rewrote `vitest.config.ts` to use `defineConfig` from `vitest/config` with the `cloudflareTest()` plugin; upgraded vitest to ^4.
**Files Affected:** `vitest.config.ts`, `package.json`
**Prevention Note:** Check the installed integration package's exports map when jumping multiple minor versions instead of assuming the documented older API.

## Issue #3 — Vite multi-entry build emitted an empty service-worker bundle
**Date:** 2026-08-23
**Task:** 1.5 Scaffold frontend with baseline PWA
**Severity:** Medium

**Problem:** Adding the service worker as a second Rollup input produced a 1-byte `dist/service-worker.js`; all code was tree-shaken away.
**Root Cause:** Vite's HTML-entry pipeline does not preserve side-effect-only additional TS entries reliably.
**Resolution:** Removed the multi-input config; the SW is now bundled as an explicit esbuild step in `build` (`esbuild src/service-worker.ts --bundle --format=iife --outfile=dist/service-worker.js`), which is deterministic and verified by output size.
**Files Affected:** `frontend/vite.config.ts`, `frontend/package.json`
**Prevention Note:** Verify emitted artifact sizes (not just exit codes) for any non-standard build output; a silent 0-byte bundle passes every check that doesn't look at content.

## Issue #4 — jsdom missing from frontend test dependencies
**Date:** 2026-08-23
**Task:** 1.5 Scaffold frontend with baseline PWA
**Severity:** Low

**Problem:** `vitest` failed to start jsdom environment: "Cannot find package 'jsdom'".
**Root Cause:** `jsdom` omitted from `devDependencies` while configured as the test environment.
**Resolution:** Added `jsdom@^26`.
**Files Affected:** `frontend/package.json`
**Prevention Note:** Treat the test environment package itself as part of test setup, not implied by vitest.

## Issue #5 — File-path mix-up overwrote src/index.ts and llm-router.ts during refactor
**Date:** 2026-08-23
**Task:** 1.6 LLM routing layer
**Severity:** Low

**Problem:** While extracting `Env` into `src/types.ts`, a write intended for one path landed on another, leaving both `src/index.ts` and `src/lib/llm-router.ts` containing only the Env interface.
**Root Cause:** Parallel edits without re-reading intermediate file state.
**Resolution:** Both files restored in full; all 19 tests pass and typecheck is clean.
**Files Affected:** `src/index.ts`, `src/lib/llm-router.ts`, `src/types.ts`
**Prevention Note:** Read a file immediately before restructuring writes to it; never assume prior content from memory mid-refactor.

## Issue #6 — Workers Builds failed with "unable to verify Worker" immediately after initial connection
**Date:** 2026-08-23
**Task:** 1.10 Workers Builds git integration
**Severity:** Medium

**Problem:** The first automated build (push event) and a manual retry both failed at initialization: "unable to verify Worker". A build triggered ~9 minutes later through the dashboard-created production trigger succeeded end-to-end.
**Root Cause:** Propagation lag — the push landed seconds after the GitHub App connection, repo connection, and build configuration were first created. Not a config error; no documentation exists for this transient message.
**Resolution:** Retry after propagation. Also cleaned up redundant API-created triggers: the dashboard connect flow already creates both a production trigger (branch `main`) and a non-production preview trigger — API trigger creation is unnecessary and hit the per-Worker trigger limit until the duplicate was deleted.
**Files Affected:** Cloudflare account config only (no repo files).
**Prevention Note:** When setting up CI integrations via API, allow propagation time before judging failures, and check what the dashboard flow already created before creating resources yourself.

## Issue #7 — Vectorize metadata filters silently return empty unless a metadata index exists AND vectors are (re)written after its creation
**Date:** 2026-08-23
**Task:** 1.12 Provision Vectorize index + Workers AI binding
**Severity:** High

**Problem:** Filtered queries (`filter: { accountId }`) returned zero results while unfiltered queries returned both tenants' test vectors. Two causes stacked: (1) Vectorize only filters on properties registered as metadata indexes — arbitrary metadata keys are returnable but not filterable; (2) vectors inserted *before* a metadata index is created are not retroactively indexed, so even after creating the indexes the old test vectors stayed invisible to filters.
**Root Cause:** Undocumented-in-summary platform behavior discovered during verification; both failure modes are silent (empty results, no error), which would have looked like "no relevant context found" in production RAG.
**Resolution:** Created string metadata indexes on `accountId`, `projectId`, `seasonId`, `episodeId` via `/metadata_index/create`; re-upserted vectors post-creation; verified tenant isolation (per-account queries exact-match, cross-tenant probe returns empty). Test vectors deleted after verification.
**Files Affected:** Cloudflare account config only (`storycrat-scripts` index); noted for `src/lib/embeddings.ts` (Task 4.8).
**Prevention Note:** Task 4.8's embedding pipeline must only ever write vectors with these four indexed properties, any new filterable metadata field needs a metadata index created first, and RAG retrieval must treat "zero results" with suspicion rather than as a neutral signal.





## Issue #8 — Production secrets gap: Groq/Deepgram keys missing from the deployed Worker
**Date:** 2026-08-24
**Task:** 6.6 QA pass / 1.7 closeout
**Severity:** High

**Problem:** The deployed Worker had `RESEND_API_KEY` and `PDF_SIGNING_SECRET` but not `GROQ_API_KEY` or `DEEPGRAM_API_KEY` — dictation, element classification, suggestions, and Conversation mode would all have failed in production despite passing every local test (tests use injected bindings and never assert live secrets).
**Root Cause:** Secrets were added to `.dev.vars` for local development but the production Worker's secret store is a separate surface with no deployment-time sync; nothing compared `/api/health` secret booleans against expectations after deploys.
**Resolution:** `DEEPGRAM_API_KEY` synced from `.dev.vars` to production via `wrangler secret put` and verified through `/api/health`. `GROQ_API_KEY` remains unset — no key exists yet (user action pending). The health endpoint's per-provider booleans are now the standing post-deploy check.
**Files Affected:** Cloudflare Worker secret store only.
**Prevention Note:** After every deploy, assert `/api/health` secret booleans match the features expected to work; a green build says nothing about configured secrets.

## Issue #8 — Resolution addendum
**Date:** 2026-08-24
`GROQ_API_KEY` synced to production and verified: `/api/health` reports `groq: true`, and the key itself validates against Groq's API (models endpoint → 200). All AI features are now live in production. Remaining unset secrets (AssemblyAI, Polar) correspond to intentionally unchosen providers/features.

## Issue #9 — App integration test broke the frontend verification gate
**Date:** 2026-08-25
**Task:** 6.6 Cross-browser QA pass
**Severity:** Medium

**Problem:** Frontend typecheck and production build failed on an `await` nested inside a synchronous `waitFor` callback; after fixing that syntax, the integration test still failed because its fetch mock treated string requests as POSTs and omitted results for module-mocked script APIs.
**Root Cause:** The new project-to-editor integration test mixed global fetch stubs with module-level API mocks and did not model the browser fetch method default (`GET`).
**Resolution:** Replaced the invalid nested `await`, derived the mocked HTTP method from `Request`/`RequestInit`, and supplied typed `fetchFeatureScript` and `fetchScript` mock results. Targeted tests, all 58 frontend tests, frontend typecheck, and the production PWA build now pass.
**Files Affected:** `frontend/src/App.test.tsx`, `tasks/tasks-0001-prd-voice-screenwriting-companion.md`
**Prevention Note:** Integration fetch mocks must model real method defaults and explicitly satisfy every module-mocked API boundary before the task ledger is marked complete.

## Issue #10 — Feature projects could neither open nor be deleted from the UI
**Date:** 2026-08-25
**Task:** Post-launch project management regression
**Severity:** High

**Problem:** Clicking any Feature project appeared to do nothing, and the project list exposed no way to delete a stuck project.
**Root Cause:** The frontend called `GET /api/projects/:projectId/feature-script`, but the Worker never registered that route. The open action swallowed the resulting rejection, while project deletion existed only as an unreachable backend endpoint. The App integration test mocked the missing route instead of exercising the Worker contract.
**Resolution:** Added the authenticated, ownership-checked feature-script lookup route; surfaced open/delete failures; added an inline two-step deletion confirmation wired to the existing cascading delete endpoint; and added backend and frontend regression tests for route ownership, delete authorization/cascade, confirmation, and failure feedback.
**Files Affected:** `src/routes/projects.ts`, `src/routes/projects.test.ts`, `frontend/src/lib/api.ts`, `frontend/src/App.tsx`, `frontend/src/App.test.tsx`
**Prevention Note:** Every frontend API helper must have an integration test proving that its exact method and path are registered by the Worker router.

## Issue #11 — Project-type control bypassed the configured shadcn UI layer
**Date:** 2026-08-25
**Task:** Post-launch UI consistency
**Severity:** Low

**Problem:** The Feature/Series project-type control was a hand-styled native `<select>`, even though the frontend is configured to use source-owned shadcn components.
**Root Cause:** The initial shell implemented the control before a shadcn Select source file or its Radix dependency had been added to the project.
**Resolution:** Added the current shadcn Select through its CLI, adapted its source-owned styling to Storycrat's design tokens, replaced the native control, and added an interaction regression test. Added the missing jsdom browser-API shims required to test Radix primitives.
**Files Affected:** `frontend/package.json`, `frontend/package-lock.json`, `frontend/src/components/ui/select.tsx`, `frontend/src/App.tsx`, `frontend/src/App.test.tsx`, `frontend/src/test-setup.ts`
**Prevention Note:** New interactive controls should start from the configured shadcn registry and be adapted in `components/ui`; integration tests should assert both semantics and application state changes.

## Issue #12 — App shell mixed native controls with the configured shadcn layer
**Date:** 2026-08-25
**Task:** Post-launch UI consistency
**Severity:** Medium

**Problem:** Most screens still used hand-styled native controls and one-off containers after shadcn had become the project's component standard, producing inconsistent states, focus treatment, and confirmation patterns.
**Root Cause:** The UI grew feature-by-feature before a complete source-owned shadcn primitive set and Storycrat-specific theme mapping were established.
**Resolution:** Added and themed the required shadcn primitives, migrated all interactive controls and common feedback/layout surfaces, replaced the inline delete confirmation with an accessible AlertDialog, and verified desktop/mobile flows through tests, typecheck, build, and the browser preview.
**Files Affected:** `frontend/src/components/ui/*`, `frontend/src/App.tsx`, `frontend/src/components/*`, `frontend/src/index.css`, `frontend/package.json`, `frontend/package-lock.json`, frontend tests and test setup
**Prevention Note:** Build new shared UI from the source-owned `components/ui` layer first; reserve custom markup for product-specific experiences such as the screenplay page and recording-state indicators.
