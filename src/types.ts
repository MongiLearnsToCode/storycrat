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
  /** Workers AI — embedding generation for RAG (PRD §7). Provisioned in task 1.12. */
  AI: Ai
  /**
   * Vectorize — semantic index over scripts/story bibles (PRD §7). Provisioned in task 1.12.
   * SECURITY: every insert/query/delete must be metadata-filtered by account +
   * project/season — an unfiltered query is a cross-tenant data leak.
   */
  VECTOR_INDEX: VectorizeIndex
  /**
   * Durable Object namespace — per-session live state (PRD §7). Provisioned in task 1.13.
   * SECURITY: obtain stubs only via `getSessionStateStub` (user-scoped ID derivation).
   */
  SESSION_STATE: DurableObjectNamespace
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
  /** Wrangler secret — HMAC key for short-lived PDF download links (Task 2.8). */
  PDF_SIGNING_SECRET?: string
  /** Resend sender identity, e.g. "Storycrat <signin@yourdomain.com>". */
  MAIL_FROM?: string
  /** Dev-only: return magic links in the API response when email delivery is unavailable. NEVER set in production. */
  AUTH_DEV_LINK_RETURN?: string
}

/** Secret names known to the app; keeps requireSecret calls typo-proof. */
export type SecretName = 'GROQ_API_KEY' | 'DEEPGRAM_API_KEY' | 'ASSEMBLYAI_API_KEY' | 'RESEND_API_KEY' | 'POLAR_ACCESS_TOKEN' | 'POLAR_WEBHOOK_SECRET' | 'PDF_SIGNING_SECRET'
