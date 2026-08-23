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



