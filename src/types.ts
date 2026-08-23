/**
 * Shared Worker bindings/environment types.
 * Kept in one place so feature modules can depend on Env without importing
 * the entry point (avoids cycles as routes grow).
 */
export interface Env {
  /** D1 — relational data (users, projects, scripts, conversations…). Provisioned in task 1.2. */
  DB: D1Database
  /** KV — auth sessions and general caching ONLY (PRD §7). Provisioned in task 1.3. */
  SESSIONS: KVNamespace
  /** R2 — exported PDFs ONLY; never audio or transcripts (PRD §7). Provisioned in task 1.4. */
  PDFS: R2Bucket
  /** Wrangler secret — Groq API key (security-doc.md § Secrets Management). Set via `wrangler secret put`. */
  GROQ_API_KEY?: string
  /** Optional model overrides, swappable without touching feature code. */
  LLM_STRUCTURING_MODEL?: string
  LLM_CRITIQUE_MODEL?: string
  /**
   * Launch-blocking attestation (security-doc.md § Third-Party Data Exposure):
   * set to "true" ONLY after Zero Data Retention has been enabled in Groq's
   * Data Controls settings. While falsy, the LLM router refuses every call —
   * no real user script content may reach Groq unattested (PRD §7).
   */
  GROQ_ZDR_CONFIRMED?: string
  /**
   * Wrangler secrets — speech-to-text. One of these becomes required when the
   * STT provider is picked in Task 3.1; both declared so either can be wired.
   * Never committed; never exposed to the frontend.
   */
  DEEPGRAM_API_KEY?: string
  ASSEMBLYAI_API_KEY?: string
  /** Wrangler secret — Resend API key for magic-link email delivery (Task 5.1). */
  RESEND_API_KEY?: string
  /** Wrangler secrets — Polar subscription management + webhook verification (Tasks 5.4). */
  POLAR_ACCESS_TOKEN?: string
  POLAR_WEBHOOK_SECRET?: string
}

/** Secret names known to the app; keeps requireSecret calls typo-proof. */
export type SecretName = 'GROQ_API_KEY' | 'DEEPGRAM_API_KEY' | 'ASSEMBLYAI_API_KEY' | 'RESEND_API_KEY' | 'POLAR_ACCESS_TOKEN' | 'POLAR_WEBHOOK_SECRET'
