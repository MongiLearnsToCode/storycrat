# Cross-Browser QA Checklist (Task 6.6)

Status as of 2026-08-24. Items verified in Chromium during development;
Safari/Firefox items below are the known risk surfaces to confirm on real
devices before public launch.

## Covered by implementation

- [x] **Safari STT container**: `DictationClient` negotiates `audio/mp4` (Safari's
  MediaRecorder output) with webm/opus fallbacks — Deepgram accepts both.
- [x] **TTS**: browser `speechSynthesis` behind an explicit toggle; guarded with
  optional chaining where APIs may be missing.
- [x] **Wake-phrase & commands**: server-side (browser-agnostic).
- [x] **PWA installability**: manifest with 192/512 PNG + maskable + SVG icons,
  apple-touch-icon, standalone display, service worker (app-shell precache,
  network-first navigations, `/api/*` never cached).
- [x] **Viewport**: `viewport-fit=cover` for iOS notch; theme-color set.

## To verify on real devices (manual, pre-launch)

- [ ] **Safari iOS**: MediaRecorder produces audio/mp4 chunks the Worker
  relays without issue (chunk sizes ~250ms).
- [ ] **Safari iOS**: speechSynthesis speaks after a user gesture (Apple
  requires one) — the toggle click satisfies this; confirm.
- [ ] **Safari macOS**: WebSocket through the Worker survives screen lock and
  resumes; the reconnecting state shows if not.
- [ ] **Safari iOS PWA install**: "Add to Home Screen" opens standalone with
  correct icon and theme color.
- [ ] **Firefox**: MediaRecorder opus-in-ogg path (`audio/ogg;codecs=opus`).
- [ ] **Both**: long dictation sessions (10+ min) — socket stability, pause/
  resume, and buffer commits at sentence/pause boundaries.
- [ ] **Both**: PDF export download on mobile browsers (Content-Disposition
  attachment).

## Known limitations (accepted for v1)

- iOS Safari < 14.5 lacks MediaRecorder audio — dictation shows the
  mic-denied/unavailable state rather than failing silently.
- speechSynthesis voice quality varies by OS; PRD flags premium TTS as a
  post-v1 upgrade.
