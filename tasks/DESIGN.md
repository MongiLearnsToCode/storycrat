---
name: Storycrat
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bdc8d1'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#87929a'
  outline-variant: '#3e484f'
  surface-tint: '#7bd0ff'
  primary: '#8ed5ff'
  on-primary: '#00354a'
  primary-container: '#38bdf8'
  on-primary-container: '#004965'
  inverse-primary: '#00668a'
  secondary: '#ffc640'
  on-secondary: '#402d00'
  secondary-container: '#e3aa00'
  on-secondary-container: '#5a4100'
  tertiary: '#ffc176'
  on-tertiary: '#472a00'
  tertiary-container: '#f1a02b'
  on-tertiary-container: '#613b00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c4e7ff'
  primary-fixed-dim: '#7bd0ff'
  on-primary-fixed: '#001e2c'
  on-primary-fixed-variant: '#004c69'
  secondary-fixed: '#ffdf9f'
  secondary-fixed-dim: '#f9bd22'
  on-secondary-fixed: '#261a00'
  on-secondary-fixed-variant: '#5c4300'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb960'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
  midnight-slate: '#0F172A'
  midnight-charcoal: '#1E293B'
  paper-white: '#F8FAFC'
  paper-texture: '#F1F5F9'
  creative-spark-blue: '#38BDF8'
  creative-spark-amber: '#FBBF24'
  recording-red: '#EF4444'
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  script-heading:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '700'
    lineHeight: '1.5'
  script-body:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  script-dialogue:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  ui-body:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.6'
  ui-label:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  ui-helper:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  margin-page: 2rem
  gutter-ui: 1rem
  script-indent-action: 0px
  script-indent-character: 2.0in
  script-indent-dialogue: 1.0in
  script-indent-parenthetical: 1.5in
---

## Brand & Style

The design system embodies a **Calm, Focused, and Creative** atmosphere, specifically tailored for the deep-work requirements of screenwriting. It avoids the cluttered, high-density utility of traditional SaaS dashboards in favor of an editorial, immersive environment reminiscent of high-end writing tools.

The brand personality is **Professional but Collaborative**. It acts as a quiet, sophisticated partner that recedes into the background during the writing process but provides sharp, distinctive visual cues when the AI is engaged. 

The aesthetic is a blend of **Minimalism** and **Tactile Design**. It uses high-quality typography and generous whitespace to reduce cognitive load, paired with subtle "Paper" textures in the editor area to ground the digital experience in the physical tradition of scriptwriting.

## Colors

The palette is rooted in **"Midnight" neutrals** to facilitate long, low-eye-strain writing sessions. 

- **Primary Surface:** Use `midnight-slate` for the main application background. 
- **Editor Surface:** Use `paper-white` or `paper-texture` for the screenplay editor specifically, creating a high-contrast, tactile focal point for the writing itself.
- **Creative Spark:** Use `creative-spark-blue` (Electric Blue) as the primary accent for AI interactions, "Thinking" states, and navigational highlights.
- **Active State:** Use `creative-spark-amber` or `recording-red` specifically for "Active Recording" indicators to provide a warm, urgent contrast to the cool midnight palette.
- **Text:** Primary UI text should use soft grays (`slate-300`) to maintain a low-profile hierarchy, while the editor uses near-black for maximum legibility.

## Typography

The typography system strictly separates **Content** from **Interface**.

- **Screenplay Content:** Uses `JetBrains Mono`. This respects the industry standard "Courier" feel while offering modern legibility and a distinct "coding-like" precision for structured data (Action, Dialogue, etc.). Script elements are always 16px (equivalent to 12pt in print).
- **Application UI:** Uses `Geist`. It provides a clean, technical, yet sophisticated look for sidebars, settings, and AI chat bubbles.
- **Scale:** On mobile, `headline-lg` should scale down to 24px (`headline-md`) to ensure the editor remains the primary focus. 
- **Formatting:** Scene headings must use the `script-heading` token (Bold/Uppercase) to provide immediate visual anchors when scrolling.

## Layout & Spacing

The layout uses a **Fixed Grid** for the editor to simulate the standard 8.5x11 paper size, centered in the viewport. The surrounding UI uses a **Fluid** model.

- **Desktop:** The editor is centered with a max-width of 850px. A collapsible sidebar (280px) on the left handles navigation (Seasons/Episodes), and a drawer on the right handles the Conversation Mode.
- **Mobile:** A single-column view where the AI Conversation and Script Editor are toggled via a persistent bottom bar.
- **Script Spacing:** Indents follow strict industry standards but are implemented via CSS margins on the structured data blocks.
- **Rhythm:** Use an 8px base grid for all UI component spacing to maintain a systematic, professional feel.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Subtle Outlines** rather than aggressive shadows.

- **The Editor "Sheet":** Sits at the highest visual elevation, using a very soft, large-radius shadow (0px 10px 30px rgba(0,0,0,0.2)) to appear as though it is resting on the dark background.
- **UI Panels:** Sidebars and drawers use a `1px` solid border (`slate-800`) to separate sections, avoiding shadows to keep the interface feeling flat and modern.
- **AI Presence:** When the AI is "Thinking" or "Recording," the container may use a subtle outer glow (0px 0px 15px) in the `creative-spark-blue` color to denote activity and digital life.

## Shapes

The design system uses **Soft (0.25rem)** roundedness for most UI elements to maintain a professional and "structured" look. 

- **Buttons & Inputs:** Use the standard `rounded` (4px) or `rounded-md` (6px) setting.
- **The Screenplay Page:** Stays sharp (0px) or uses a very minimal `rounded-sm` to maintain the illusion of a stack of paper.
- **AI Chat Bubbles:** Use `rounded-lg` to feel more approachable and distinct from the rigid structure of the script.

## Components

### Buttons & Inputs
- **Primary Action:** Solid `midnight-charcoal` with a `creative-spark-blue` border. High-contrast white text.
- **AI Trigger:** A specialized floating action button (FAB) that pulses with a `creative-spark-blue` gradient when active.
- **Input Fields:** Minimalist under-lines or subtle ghost-borders; focus states should highlight the border in `creative-spark-blue`.

### The Editor
- **Element Blocks:** Each screenplay element (Action, Dialogue) should show a subtle hover state with a "type label" (e.g., "ACT") in the margin to help the writer understand the AI's classification.
- **Active Recording Bar:** A persistent, high-visibility bar at the bottom or top of the editor using `recording-red` or `creative-spark-amber` to ensure the user knows their mic is live. This bar has two distinct states: **Dictation** (standard recording color/pulse) and **Command Mode** — triggered by the "Partner" wake-phrase — which must read as visually distinct (e.g. a `creative-spark-blue` pulse instead of `recording-red`) so the writer can tell at a glance whether the app is transcribing their words or waiting on a command.

### System Status
- **Mic Access Denied:** A persistent, non-dismissible-until-resolved banner (not a toast) — the writer needs to know dictation is unavailable, not have it flash and disappear.
- **Reconnecting:** A `recording-red` pulsing dot on the Active Recording Bar, replacing the normal recording pulse, while the STT connection attempts to re-establish.
- **AI Rate Limit Reached:** A toast/banner distinct from a generic error — should communicate "try again shortly," not read as a broken app.
- **Command Not Recognized:** A brief, low-friction inline indicator (not a blocking modal) after a wake-phrase utterance the system couldn't parse — the writer should be able to just repeat themselves without breaking flow.
- **Free-Tier TV Notice:** A calm, informational inline helper text (not a warning-colored banner — this isn't an error) shown at TV Series creation time, using `ui-helper` typography. It's disclosure, not an obstacle — the tone should read as "here's how this works," not "watch out."

### AI Conversation
- **Messages:** AI responses should be styled with a slightly different background tone than the user's messages.
- **Citations:** When the AI references the script, use a "Script Chip"—a small, monospaced badge that links directly to the scene or line being discussed. For TV Series projects, a citation from a *different* episode than the one currently open must visually indicate its source (e.g. an "EP.2" prefix on the chip) so the writer immediately knows the AI is drawing on earlier material, not the current page.
- **Get Notes panel:** a single Get Notes response reads as a written report card, not a chat bubble — no "reply" affordance implied. Present it as a static panel (still using `ui-body`/Script Chips as normal) with a clearly secondary "Continue in Conversation" action at the bottom for anyone who wants to go further. The visual goal is to make it obvious this is a one-shot note the writer can simply read and close, not the start of an expected back-and-forth.

### Navigation
- **Project Tree:** A clean vertical list for TV Series (Season > Episode) using `ui-label` typography, with active states indicated by a left-side vertical accent line in `creative-spark-blue`.