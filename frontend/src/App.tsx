/**
 * Baseline app shell (Task 1.5).
 * Deliberately minimal: real screens land in tasks 2.x–6.x per app-flow.md.
 * Styling already follows DESIGN.md tokens via index.css.
 */
export default function App() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-on-surface">Storycrat</h1>
      <p className="max-w-md text-[15px] leading-relaxed text-on-surface-variant">
        A voice-first screenwriting companion. You write the story — it keeps up.
      </p>
    </main>
  )
}
