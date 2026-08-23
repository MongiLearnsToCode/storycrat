# Storycrat Launch Checklist

Items that must be verified before real user content flows through the system.
Each item names its owner-side action and the code that enforces it.

## [x] Groq Zero Data Retention (ZDR) — BLOCKING

- **Source:** `security-doc.md` § Third-Party Data Exposure; PRD §7; dev-prompt § AI/LLM Architecture
- **Action (human, Groq dashboard):** Enable Zero Data Retention under Groq → Data Controls. Self-serve, available on the free tier. Prevents even temporary troubleshooting/abuse-investigation logs from being retained.
- **Enforcement (code):** The LLM router (`src/lib/llm-router.ts`) refuses every outbound call unless `GROQ_ZDR_CONFIRMED === "true"` in the Worker environment. Deployed default is `"true"` (`wrangler.jsonc`).
- **To complete:** After verifying ZDR is on in your Groq account:
  1. Set `GROQ_ZDR_CONFIRMED: "true"` in `wrangler.jsonc` vars (and/or dashboard environment config).
  2. Tick this checkbox and log the confirmation date + who verified it below.

  **Confirmed:** 2026-08-23 — attested by repo owner (MongiLearnsToCode). Code-side gate flipped to pass; fail-closed guard retained for regressions.

## [x] STT provider retention/training terms (Deepgram or AssemblyAI) — before Writing mode ships

- **Source:** `security-doc.md` § Third-Party Data Exposure
- **Action:** Confirm the chosen provider's retention/training terms meet the same standard as Groq ZDR. Audio is discarded immediately after transcription on our side; verify the provider doesn't retain it independently.

---

## Non-blocking, documented future options

### OpenTelemetry export to Sentry

- **Status:** Not a v1 build item (PRD §7). Workers Logs/Observability (enabled natively on the Worker, verified 2026-08-23 — invocations and errors queryable per service) is sufficient for a solo developer to catch STT/LLM call failures.
- **Path if needed later:** Wire an OpenTelemetry exporter from the Worker to Sentry when alerting needs grow beyond what the Cloudflare dashboard offers. Feature code already routes all third-party failures through typed error classes (`LlmError`, `LlmRateLimitError`, `MissingSecretError`), which gives any future exporter clean signals to attach spans/alerts to without refactoring feature code.
