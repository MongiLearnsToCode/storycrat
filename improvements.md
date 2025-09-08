# StoryCrat Build Order Task List

---

## Rules for Carrying Out Tasks
1. Each task and sub-task must be marked as complete with `[x]` once finished.  
2. Tasks must be done **in order of build phases** (do not skip ahead).  
3. Within a phase, complete all **Quick Wins (⚡)** before moving on to **Big Lifts (⛰️)**.  
4. Test after each phase before starting the next one.  
5. Keep commits clean: one phase per commit branch if possible.  
6. Do not add new features not listed here until all phases are complete.  

---

## Phase 1: Core Editor Polish (foundation first)
- [ ] ⚡ **Beat-by-Beat Editor Improvements**
  - [ ] ⚡ Add keyboard shortcuts (new beat, delete beat, navigation).
  - [ ] ⛰️ Implement undo/redo functionality.
  - [ ] ⚡ Enable inline editing with smooth transitions.
  - [ ] ⛰️ Add drag-and-drop reordering of beats.

---

## Phase 2: AI Suggestions (small + scoped)
- [ ] ⚡ **Refactor Suggestions**
  - [ ] ⚡ Replace hardcoded prompts with curated template bank (adaptive to framework).
  - [ ] ⚡ Add “AI Suggest” button to editor toolbar.
  - [ ] ⛰️ Implement lightweight AI integration:
    - [ ] ⚡ Restrict scope (e.g., “3 dialogue prompts for this character in this beat”).
    - [ ] ⚡ Ensure responses are small, fast, and non-blocking.

---

## Phase 3: Editor UI/UX Redesign
- [ ] **Editor Area (Center Column)**
  - [ ] ⚡ Add floating toolbar with actions (undo, redo, formatting, AI suggest).
  - [ ] ⚡ Show keyboard shortcut hints in tooltips.
- [ ] **Left Column (Story Structure)**
  - [ ] ⚡ Add progress indicators next to beats (checkmarks/completion %).
  - [ ] ⛰️ Make beats drag-and-droppable (if framework allows).
  - [ ] ⛰️ Add collapsible sections for long frameworks.
- [ ] **Right Column (Characters & Conflicts)**
  - [ ] ⚡ Redesign panel into tabs:
    - [ ] ⚡ Characters tab (list + quick actions).
    - [ ] ⛰️ Conflicts tab (lightweight tracker showing overlapping goals/tensions).
    - [ ] ⛰️ (Optional later) Relationships tab (hide behind “beta” badge).
  - [ ] ⛰️ Make right column resizable.

---

## Phase 4: Export Functionality
- [ ] ⚡ **Expand Export Options**
  - [ ] ⚡ Add support for `.docx` export.
  - [ ] ⚡ Add support for Markdown export.
  - [ ] ⛰️ Create export modal with customization options:
    - [ ] ⚡ Choose file type (TXT, PDF, DOCX, Markdown).
    - [ ] ⚡ Include/exclude character bios.
    - [ ] ⚡ Include/exclude framework notes.
    - [ ] ⛰️ Select font and layout options.

---

## Phase 5: Dashboard / Progress Integration
- [ ] **Dashboard**
  - [ ] ⚡ Add writing streak chart (Recharts).
  - [ ] ⛰️ Add word count per session chart (Recharts).
- [ ] **Story Editor (Mini Widget)**
  - [ ] ⚡ Add tiny progress/streak widget in top bar (next to Export).

---

## Phase 6: Visual Hierarchy & Polish
- [ ] **UI/UX Enhancements**
  - [ ] ⚡ Increase spacing between columns.
  - [ ] ⛰️ Make editor column slightly wider (editor = primary focus).
  - [ ] ⚡ Add subtle color accents (completed beats, character conflicts).
  - [ ] ⛰️ Ensure dark/light themes stay consistent after redesign.

---

### Guiding Principle
> Build depth first, then smart suggestions, then design polish. Do not chase shiny features until the core writing experience is frictionless.

