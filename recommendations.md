# StoryCrat UX Improvement Plan

- [x] **1. Improve the New User Welcome Experience:**
  - [x] Redesign the root page (`/`) as a welcoming landing page for all users.
  - [x] Move the existing "recent stories" view to a new `/projects` route for authenticated users.
  - [x] Update authentication and routing logic to direct logged-in users to `/projects`.

- [x] **2. Add Onboarding to the Story Editor:**
  - [x] Implement a simple, interactive onboarding tour for the `/story` page.
  - [x] Use popovers or highlights to explain the Story Structure, Writing Area, AI Suggestions, and Character panel.

- [x] **3. Enhance AI Suggestions:**
  - [x] **Short-Term:** Modify the suggestion logic to cycle through options instead of picking one randomly.
  - [ ] **Long-Term (Optional):** Integrate a real LLM for context-aware suggestions.

- [x] **4. Expand Character Management:**
  - [x] Implement functionality to edit existing characters.
  - [x] Implement functionality to delete characters.
  - [x] Add more fields to the character creation/editing dialog (e.g., "Appearance", "Backstory").
