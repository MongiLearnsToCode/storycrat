# PRD: Voice-First AI Writing Companion for Screenwriters

**Working title:** "Storycrat" (confirmed working name — can be revisited before launch)

## 1. Introduction / Overview

Screenwriters think out loud, in fragments, before they think in scene headings and dialogue blocks. Most screenwriting software assumes the writer already knows what to type. This product removes that assumption.

The app is a voice-first screenwriting environment with two modes:

- **Writing mode** — the writer dictates directly into the screenplay. The system transcribes and structures natural speech into properly formatted screenplay elements (scene headings, action, dialogue, parentheticals) while preserving the writer's intent and voice, offering small suggestions or clarifying questions only when useful. The writer can also edit and navigate the document entirely by voice, using a wake-phrase to separate commands from dictated content.
- **Conversation mode** — the writer talks *about* the screenplay with the AI: a character, a scene, a structural problem, a theme, a tone. The AI can reference films, directors, writers, and craft techniques as reference points, and it is designed to disagree with the writer when the material calls for it — flagging weak motivation, repetition, on-the-nose dialogue, or unearned exposition. For TV Series projects, the AI can draw on earlier episodes in the same season, not just the one currently open.

The core relationship is **Writer ↔ AI ↔ Screenplay**, not Writer → AI → Screenplay. The AI never authors the screenplay on the writer's behalf. Its job is to shrink the gap between "I have an idea" and "I have expressed the idea exactly as I intended."

This is being built as a subscription product for other screenwriters, not a personal tool, and is fully scoped to serve both film and TV writers from v1.

## 2. Goals

1. Let a writer go from spoken thought to correctly formatted screenplay text with minimal manual reformatting.
2. Let a writer edit and navigate an existing script entirely by voice, without needing to switch to the keyboard mid-session.
3. Give the writer access to a creative partner that can hold a genuine critical opinion about their material — not just supportive, generic feedback — whether the writer wants an open conversation or a single low-friction note, with awareness of the whole season for TV writers, not just the current episode.
4. Preserve the writer's authorship at all times: the AI suggests, questions, and structures; it never generates unrequested creative content into the script.
5. Serve film screenwriters and TV/episodic writers equally well, including season- and episode-level structure and season-wide continuity awareness for TV.
6. Ship a working, sellable v1 for a solo developer to build and maintain, at a cost-conscious inference budget, with real safeguards against silent data loss, cost blowouts, and IP exposure.

## 3. User Stories

1. As a screenwriter, I want to dictate a scene while pacing around my room, so that I can capture dialogue and action while it's still alive in my head, without stopping to type.
2. As a screenwriter, I want the system to correctly format my dictation into scene headings, action lines, and dialogue, so that I don't have to manually reformat plain speech into screenplay conventions.
3. As a screenwriter, I want to edit and delete existing lines by voice, so that I don't have to break my pacing and reach for a keyboard mid-session.
4. As a screenwriter, I want the app to clearly tell commands and dialogue apart, so that a character saying "cut to the chase" doesn't get misread as a scene transition.
5. As a screenwriter, I want to ask the AI what's wrong with a scene I've written, so that I can find weaknesses before a reader or exec does.
6. As a screenwriter, I want the AI to push back when it disagrees with a creative choice, so that I'm not just getting validation.
7. As a screenwriter, I want to discuss a character's motivation in plain conversation and have that discussion available to refer back to, so that I don't lose good thinking between sessions.
8. As a screenwriter, I want to switch fluidly between talking about my screenplay and writing directly into it, so that thinking and writing don't feel like two separate tools.
9. As a TV writer, I want to maintain a season-level story bible separate from any single episode, so that I can track arcs that span the whole season.
10. As a TV writer, I want the AI to know both my season arc and the episode I'm currently working on, so that its feedback catches continuity problems, not just line-level issues.
11. As a TV writer on episode 10, I want the AI to recall what happened in episode 2 without me re-explaining it, so that continuity feedback works across the whole season, not just within one episode.
12. As a new user, I want to try the product on one real script for free, so that I can judge whether it's worth paying for before committing.
13. As a screenwriter who's comfortable dictating but not yet comfortable holding an open conversation with an AI, I want a single "get notes" action that gives me written feedback without opening a chat, so that I can still benefit from the AI's critique on my own terms and at my own pace.
14. As a screenwriter working on a 120-page feature, I want the AI's feedback to stay grounded in my actual script even though it's long, so that Conversation mode doesn't break down or give vague, generic feedback as my draft grows.

## 4. Functional Requirements

### Core screenplay document
1. The system must allow a user to create, name, and store multiple screenplay projects.
2. Each project must be one of two types: **Feature Film** (a single script) or **TV Series** (a container for one or more Seasons, each containing one or more Episodes).
3. The system must maintain each script as structured data (scene headings, action, character, dialogue, parenthetical, transition) — not as unstructured plain text — so formatting is always derivable and consistent.
4. The system must render each script in standard industry screenplay format (courier-style monospace, correct margins/indentation per element type) in the editor view.
5. The system must let the user manually edit any element via keyboard, in addition to voice input.

### TV/episodic structure
6. For TV Series projects, the system must let the writer maintain a season-level story bible/arc document, separate from any individual episode's script, covering season-wide throughlines, character arcs, and planned beats.
7. For TV Series projects, each Episode must have its own independent script using the same structured data model and formatting rules as a Feature Film script (Requirements 3–5 apply per episode).
8. The system must let the writer navigate between episodes within a season, and between seasons within a series (e.g., an episode/season list or sidebar).
9. In Conversation mode, when discussing an episode that belongs to a TV Series, the AI must have read access to both that episode's script and the season-level story bible, so it can flag inconsistencies with the season arc, not just issues within the single episode.
10. The system must maintain a semantic index (vector embeddings) of every episode's script and the season's story bible, so Conversation mode can retrieve relevant passages from *any* earlier episode in the season — not just the current one — when a discussion calls for it (e.g. "what did John tell Mary in episode 2?" asked while working on episode 10). This must work without requiring every episode's full script to be loaded into a single AI context window at once.

### Writing mode
11. The system must provide a "Writing mode" in which the user dictates via microphone directly into the current script.
12. The system must transcribe spoken audio to text in near-real-time (streaming), so the writer can see their words appear as they speak.
13. The system must classify dictated speech into the correct screenplay element type (action vs. dialogue vs. scene heading, etc.) using context (e.g., a character name spoken alone on a line signals a dialogue block follows).
14. The system must allow the writer to correct a misclassified element (e.g., re-tag a line from "action" to "dialogue") with a single action.
15. The system must support the writer speaking formatting commands prefixed with the wake-phrase **"Partner"** (e.g., "Partner, new scene," "Partner, cut to," "Partner, [character name] enters") that map to screenplay structure. The wake-phrase is the mechanism that disambiguates a spoken command from ordinary dialogue or action content that happens to contain similar words — e.g., a character's dialogue line "cut to the chase" must never be misread as a scene transition, because it isn't prefixed with the wake-phrase.
16. The system must support voice-driven editing of existing content via the same wake-phrase pattern, including at minimum: selecting the most recent line or scene ("Partner, select last line"), deleting the currently selected element ("Partner, delete that"), re-tagging an element's type ("Partner, change that to a parenthetical"), and replacing a scene heading's text ("Partner, change the scene heading to INT. HOUSE - NIGHT").
17. Any destructive voice command (e.g., delete) must be either instantly and visibly undoable (a one-action Undo, not a confirmation dialog that breaks flow) or require a brief confirmation before applying — misrecognized speech must never silently destroy a writer's work.
18. The system must give the writer a clear, distinct visual (and optionally audio) confirmation of whether a wake-phrase utterance was understood as a valid command; if not understood, the system must not silently discard it — the writer must be able to tell they need to repeat or rephrase.
19. The system may offer small inline suggestions or alternative phrasings during dictation, but must never insert text into the document without the writer accepting it.
20. The system must let the writer pause and resume dictation without losing transcription state.

### Conversation mode
21. The system must provide a "Conversation mode," a chat-style (voice and/or text) interface scoped to the current project (and, for TV, the current episode/season context).
22. The system must give the AI in Conversation mode read access to the relevant script content and season story bible (where applicable), plus any semantically relevant passages retrieved from earlier episodes (Requirement 10), so its feedback is grounded in what's actually on the page — not just what the writer says is on the page, and not just the current episode in isolation.
23. The AI's responses in Conversation mode must be capable of substantive disagreement: identifying repetition, unclear motivation, on-the-nose dialogue, exposition dumps, or a mismatch between stated intent and actual page content, when relevant.
24. The AI must be able to reference specific films, directors, screenwriters, genres, and craft techniques as comparative examples in its responses.
25. The system must never write new screenplay content (scenes, dialogue, action) directly into the document from Conversation mode. Conversation mode is discussion-only; any resulting text must be manually written or dictated by the writer in Writing mode.
26. The system must persist conversation history per project (and per episode, for TV), so the writer can scroll back through prior discussions.
27. The system must allow the writer to reference a specific scene, character, or page range when starting a conversation topic (e.g., "let's talk about Act 2").

### Mode switching & voice infrastructure
28. The system must let the writer switch between Writing mode and Conversation mode within a single session without losing state in either.
29. The system must use a real-time streaming speech-to-text service (not batch transcription) for both modes.
30. The system must convert AI responses in Conversation mode to speech (text-to-speech) when the writer is interacting by voice, with an option to read responses as text only.
31. The system must work on both mobile and desktop web browsers as an installable Progressive Web App (PWA).

### System status & error handling
32. The system must detect and clearly surface, with a distinct non-generic UI state for each (see DESIGN.md): microphone access denied, network/STT connection dropped (with an automatic reconnect attempt), and AI rate-limit reached.

### Accounts & billing
33. The system must require an account (email-based) to create or access a project.
34. The free tier allows exactly **one script, ever, per account** — tracked as a cumulative lifetime count, not a count of currently-existing scripts. Deleting a script does not restore the allowance. Creating a second script (or a second episode, for a TV project) requires an active subscription.
35. The system must require an active paid subscription to use Writing mode and Conversation mode beyond the free tier's one-script allowance.
36. The system must let a user manage their subscription (upgrade, cancel) from within the app.

### Export
37. The system must let the user export any script as an industry-standard formatted PDF, using a Workers-runtime-compatible rendering path (see Technical Considerations).

### Quick Notes (low-friction feedback)
38. The system must provide a **"Get Notes"** action, available directly from the editor in either mode, that returns written AI feedback on the current scene (or the whole script, at the writer's choice) without requiring the writer to open or engage with the Conversation-mode chat interface.
39. Get Notes must use the same grounded critique logic as Conversation mode — reading the actual script content, and for TV Series episodes the season story bible and cross-episode retrieval (Requirement 10) — and must be equally capable of substantive disagreement (Requirement 23). It is not a lighter, softer version of the critique; it is the same critique delivered in a lower-friction shape.
40. A Get Notes response must never be inserted into the script document, under the same constraint as Requirement 25.
41. A Get Notes response must be saved to the project's conversation history (Requirement 26) so it isn't lost, but presented visually distinctly from an open chat thread — the writer should be able to tell at a glance that this is a one-shot note, not something expecting a reply. The writer may optionally continue from a Get Notes response into full Conversation mode if they want to discuss it further, but nothing about Get Notes requires that.

### Script Grounding for Long Scripts
42. The system must chunk and semantically index **every** script — Feature Film or Episode, regardless of length — via the same Vectorize mechanism used for cross-episode retrieval (Requirement 10), not just TV episodes. A 120-page feature must not be stuffed whole into a single LLM call; it must be grounded the same retrieval-backed way a TV season is.
43. Context assembly for Conversation mode and Get Notes must always include the scene(s) closest to whatever the writer is currently focused on or asking about directly — retrieval supplements that, it never replaces it. The writer's immediate context should never depend entirely on a similarity search picking the right passage.

### Vectorize Sync on Mutation
44. The system must keep the Vectorize index in sync with `script_elements` mutations — including voice-driven edits and deletions (Requirement 16) and manual keyboard edits (Requirement 5) — not only on an explicit save action, since the editor has no separate save step (content persists continuously, per Requirement 3). Re-embedding may be debounced per scene rather than fired on every keystroke, but a deleted element must be removed from the index promptly enough that RAG retrieval (Requirement 10, 42) never surfaces content the writer has already deleted.

### Free-Tier UX Clarity
45. If a free-tier user creates a TV Series project, the UI must clearly indicate — before they attempt to create a second episode, not only when they hit the block — that the one-script lifetime allowance (Requirement 34) covers exactly one episode, not a full season. Hitting the paywall on Episode 2 without warning reads as a bait-and-switch; the warning must come early enough to prevent that impression.

### Mode-Switch Voice Handling
46. If the writer has an active dictation session in Writing mode when they switch to Conversation mode (or an active voice interaction in Conversation mode when they switch to Writing mode), the system must cleanly stop the active STT session — committing any buffered transcript per the normal boundary rules (§7 Real-time state architecture) — rather than silently rerouting a live microphone stream between two different consumers. The writer must explicitly start voice input again in the new mode. This keeps the handoff visible and predictable, consistent with the not-silently-guessing principle already established for wake-phrase confirmation (Requirement 18).

## 5. Non-Goals (Out of Scope for v1)

- **No native mobile app.** PWA only for v1; no App Store / Play Store submission.
- **No offline mode.** The app requires an internet connection; no local-first or offline-sync capability in v1.
- **No full-script auto-generation.** The AI must never generate a whole scene, page, or draft unprompted or on the writer's behalf, in either mode. This is a hard constraint, not a stretch goal to relax later without an explicit product decision.
- **No real-time multi-writer collaboration** (two people editing the same script live) is out of scope for v1. Single-writer-per-project only.
- **No production/breakdown tooling** (shot lists, budgeting, scheduling) — this is a writing tool, not a production tool.
- **No screenplay analysis/coverage-for-hire marketplace** — the AI is the only reader in v1; no human coverage service.
- **No raw audio retention.** Dictation audio is never stored — see Technical Considerations.
- **No cross-project retrieval.** The semantic index (Requirement 10) is scoped to a single season within a single project — the AI never draws context from a different project, even one owned by the same account.

## 6. Design Considerations

- The editor should visually read as a screenplay page (monospace, correct margins) even while structured underneath — the writer should always feel like they're looking at a script, not a chat log or outline.
- Writing mode and Conversation mode should feel like two views of the same room, not two different apps — a persistent, low-friction way to switch (e.g., a mode toggle always visible, not buried in a menu).
- Conversation mode should visually distinguish "the AI is reading the script" moments from "the AI is just chatting" — the writer should always know when feedback is grounded in the actual page content.
- For TV Series projects, the season story bible and the episode list should be easy to reach from within any single episode — the writer shouldn't have to leave the episode they're working on to check season-level continuity.
- **Command Mode state:** when the wake-phrase "Partner" is detected, the UI must visually shift into a distinct state from ordinary dictation (Requirement 18) — the writer needs an unambiguous signal of "the app thinks I'm giving it a command right now," not just the standard recording indicator.
- **System status states:** distinct, designed states for mic-denied, connection-dropped/reconnecting, and rate-limit-reached (Requirement 32) — not generic error toasts.
- Design system is defined in `tasks/DESIGN.md` (colors, typography, spacing, elevation, shapes, component rules) — implement against it directly rather than general skill guidance. For design/UI generation, use the `paper.design` plugin/MCP if and when it's available; fall back to other available design skills if it doesn't come through. `tasks/inspo-screens/` is an optional folder of reference screens built with this system — check it before inventing a new UI pattern if it has been provisioned, but its absence is not a blocker.

## 7. Technical Considerations

- **Infrastructure:** Cloudflare Workers (TypeScript), Durable Objects (per-session real-time state for active dictation/conversation sessions — see below), D1 (relational data — projects, seasons, episodes, screenplay elements, conversation history, user accounts, lifetime script-count per account), KV (auth sessions/cache only), R2 (exported PDFs only), Vectorize (semantic index for cross-episode retrieval, Requirement 10).
- **Real-time state architecture:** Continuously writing every transcribed word straight to D1 would thrash the database. Each active dictation or conversation session is backed by a **Durable Object** (using the WebSocket Hibernation API to stay cheap while idle) that holds the live transcript buffer for the duration of the session; the DO's Alarms API commits the buffer to D1 `script_elements` at a sentence boundary, a paragraph break, or an explicit pause/stop — never per word. This is the correct native primitive for this job, not a workaround: KV is not designed for this kind of live, single-writer, connection-bound state. The same buffering principle applies to element-classification LLM calls — batch several words/a clause before firing a classification call, rather than calling per word; this also protects against exhausting Groq's per-minute request-rate limits during a long dictation session.
- **Retrieval-augmented grounding (RAG):** Every script — Feature or Episode — is chunked (by scene) and embedded via Workers AI on creation, with vectors upserted into a Vectorize index scoped by account, project, and (for TV) season. On save/edit, re-embed the affected scene rather than the whole script; debounce this per scene to avoid firing on every keystroke, and remove deleted elements from the index promptly — the index must never be stale enough to surface content the writer has already deleted (Requirement 44). When Conversation mode or Get Notes needs context, always include the scene(s) closest to the writer's current focus directly, and supplement with the top-K most relevant retrieved passages — from elsewhere in the same script for a long Feature, and from other episodes in the season for TV (Requirement 10, 42–43) — rather than loading an entire script (or season) into one call. **Vectorize queries must be filtered by the requesting user's account and project/season metadata on every query** — an unfiltered or globally-shared index would be a cross-tenant data leak (see `security-doc.md`).
- **LLM routing:** v1 routes both Writing mode (structuring dictation) and Conversation mode (creative critique) through Groq's free-tier models, to keep inference cost near zero while validating the product. This is a deliberate cost-first choice, not a quality ceiling. Keep all model calls behind a single routing layer so either mode's model can be swapped independently once usage data justifies a paid upgrade — Conversation mode is the most likely candidate for a stronger model later, since critique quality is the core value proposition. Do not hardcode a specific model directly into feature code. Writing mode's cost/rate-limit risk is primarily request-frequency (many small calls per session — mitigated by the buffering above); Conversation mode's risk is primarily context size per call (mitigated by the RAG approach above, which also reduces token cost by avoiding whole-season context stuffing).
- **Groq data handling (launch-blocking):** Groq's terms already prohibit training on customer inputs/outputs without explicit permission, and this applies account-wide, not just to paid tiers. Before processing any real user script content, **enable Zero Data Retention (ZDR) in Groq's Data Controls settings** (self-serve, available on the free tier) so even temporary troubleshooting/abuse-investigation logs aren't retained. This is a launch checklist item, not an optional nice-to-have, given the product handles unpublished creative IP.
- **Speech-to-text:** Deepgram or AssemblyAI (real-time streaming). Do not use browser-native Web Speech API as the primary pipeline — cross-browser support (especially Safari) is inconsistent, and streaming quality matters for the dictation experience to feel live.
- **Wake-phrase detection:** The "Partner" wake-phrase (Requirements 15–16) must be detected within the streaming STT layer, and this detection must happen **before** the Durable Object's Alarms API commits any pending buffer to D1 — not just "before content is committed" in general. If a wake-phrase is detected mid-buffer (i.e. before a natural sentence/pause boundary would otherwise trigger a commit), the system must split the buffer at that point: commit the pre-phrase text as ordinary dictated content, and route only the post-phrase text to command parsing, discarding it from the content buffer entirely. The wake-phrase detector runs on every incoming transcript chunk, not just at commit time — sequencing matters here, and getting it wrong means a command can leak into the script as literal dialogue, or content can get silently swallowed as a misfired command.
- **Audio handling:** Raw dictation audio is streamed to the STT provider and discarded immediately after transcription. No audio is stored in R2 or anywhere else — only the resulting text persists.
- **Text-to-speech:** Browser-native `speechSynthesis` for v1 (free, no added infra). Flag as a likely post-v1 upgrade to a higher-quality TTS provider (e.g., ElevenLabs, Cartesia) once cost is justified by usage.
- **Auth:** Email/magic-link authentication (via Resend, per existing stack preference), sessions stored in KV. No third-party social login required for v1 unless the developer finds strong reason otherwise.
- **Billing:** Polar, per existing stack preference, for subscription management. Polar plan should match the pricing decision in Section 9.
- **Frontend:** React, Tailwind, shadcn/ui.
- **Data model:** A Project is either `type: feature` (one Script) or `type: series` (one or more Seasons, each with one or more Episodes, each Episode having its own Script; plus one Story Bible document per Season). A Script is stored as an ordered array of typed elements (scene_heading, action, character, dialogue, parenthetical, transition) — not a formatted string. All rendering (editor view, PDF export) must derive from this structured data, never the reverse.
- **PDF export:** Must produce industry-standard screenplay formatting using **Courier Prime** (open-source, SIL Open Font License — the actual industry-standard screenwriting face), correct margins per element type, and page numbering. The font file must be bundled with or correctly referenced by the PDF-generation library. **Runtime risk to verify during implementation (Task 2.7):** many popular PDF libraries assume full Node.js APIs that aren't available in the Workers runtime by default; confirm the chosen library works under Workers' `nodejs_compat` flag before committing to it. **Defined fallback if it doesn't:** generate the PDF client-side in the browser instead (e.g. `@react-pdf/renderer` or `jsPDF`, both of which run fine in a browser context with no Workers runtime constraints), using the same structured `script_elements` data already loaded in the editor, then upload the resulting file from the client to the Worker for storage in R2 — preserving the same "stored in R2, served via signed URL" flow either way. Don't get stuck trying to force a server-side library to work under `nodejs_compat`; this fallback exists precisely so that isn't a dead end.
- **CI/CD & observability:** Automated deployment via **Workers Builds** — Cloudflare's native git integration (GitHub/GitLab), auto-building and deploying on push, no separate CI YAML to maintain. Observability via **Workers Logs/Observability**, enabled by default for new Workers (logs, traces, and metrics, queryable in the Cloudflare dashboard) — sufficient for a solo developer to catch STT/LLM call failures without standing up a third-party tool for v1. An OpenTelemetry export to Sentry remains a straightforward later upgrade if alerting needs grow beyond what the dashboard offers.

## 8. Success Metrics

- A writer can complete an uninterrupted 10-minute dictation session in Writing mode with correctly classified screenplay elements requiring only minor manual correction (target: less than 10% of lines need re-tagging).
- Wake-phrase commands are correctly recognized as commands (not misfired as dialogue, and not missed) at a rate high enough that writers stop noticing the mechanism — no specific number set pre-launch; establish a baseline in early testing.
- A writer engages with Conversation mode at least once per active writing session on average (signals the mode is genuinely useful, not a novelty).
- TV writers report the cross-episode retrieval (Requirement 10) surfaces a real earlier-episode detail correctly at least once per season worked on, without the writer having to re-explain it.
- Free-to-paid conversion is measurable against the one-script lifetime cap (baseline to be established post-launch).
- Exported PDFs pass visual inspection against standard screenplay formatting with no manual cleanup needed.

## 9. Competitive Landscape & Pricing

Researched screenwriting and AI-writing tools (pricing as of August 2026):

| Tool | Model | Price |
|---|---|---|
| Final Draft | One-time license | $199.99–$249 |
| Fade In | One-time license | $79.95 |
| Celtx | Subscription | ~$15/month |
| WriterDuet | Freemium + subscription | Free (3 scripts) → ~$9.99/month or $89/year |
| Squibler | Subscription, AI-assisted | From $9.99/month |
| Sudowrite | AI-assisted (prose-focused, not screenplay-specific) | $10–19/month (Hobby) up to $44–59/month (Max) |

**Takeaways:**
- Pure formatting tools (Final Draft, Fade In) are one-time purchases — not a useful anchor for a subscription product.
- Subscription screenwriting tools without deep AI cluster around $10–15/month (Celtx, WriterDuet).
- AI-assisted writing tools with genuine creative-generation features price higher — $19–29/month for a usable tier (Sudowrite Hobby/Professional).

**Pricing decision:** Free tier (one script, lifetime cap, per Requirement 34) → single paid tier at **$15/month** (or ~$12/month billed annually, $144/year). This sits above pure-formatting subscription tools — justified by the Conversation-mode critique feature, which they don't offer — and below Sudowrite's Professional tier, justified by v1 starting on a free (Groq) inference backend rather than a premium model, and by not yet offering fiction-specific tooling like a Story Engine. Revisit this price once the Conversation-mode model is upgraded off Groq's free tier, since that raises the cost basis per user (see the model-upgrade trigger in Open Questions).

## 10. Open Questions

1. **Season story bible structure.** TV writers get a season-level story bible (Requirement 6) — the exact fields/structure for that document (beat sheet? loose notes? episode grid?) still need to be defined in more design detail; not blocking the task list.
2. **Multiple paid tiers.** v1 ships with a single paid tier for simplicity. Revisit whether a higher tier (more projects, priority model access) makes sense once there's usage data.
3. **Conversation-mode model upgrade trigger.** Directional criteria are now set (Technical Considerations: Writing mode risk is request-frequency, mitigated by buffering; Conversation mode risk is context size, mitigated by RAG) — but the exact numeric trigger (e.g. "X% of Conversation-mode calls throttled in a week") isn't set pre-launch. Establish this from real Groq dashboard/rate-limit data in the first weeks of usage, don't wait for a crisis to define it reactively.
4. **Vectorize embedding model choice.** Which Workers AI embedding model to use for the semantic index (Requirement 10) isn't pinned down yet — pick during Task implementation based on Workers AI's current catalog and the 768-dimension-class models typical of that platform; not a product-level decision.
