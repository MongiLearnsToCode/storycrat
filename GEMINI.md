# GEMINI.md

## Project Overview

This is a Next.js application called StoryGenPro that provides writers with a structured, guided environment for story creation using the Hero's Journey framework with AI-assisted suggestions.

**Key Technologies:**

*   **Framework:** Next.js (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS with Shadcn UI
*   **State Management:** Zustand
*   **Authentication:** Clerk
*   **Backend & Database:** Convex

**Architecture:**

The application uses the Next.js App Router. Client-side state for the active story is managed with Zustand in `src/lib/convex-store.ts`. For unauthenticated users, stories are persisted to local storage. For authenticated users, stories are stored in a real-time database provided by Convex.

The database schema is defined in `convex/schema.ts` and consists of a single `stories` table. Server-side logic (e.g., creating, updating stories) is handled by Convex functions defined in `convex/stories.ts`.

## Building and Running

**1. Install Dependencies:**

```bash
npm install
```

**2. Run the Development Server:**

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

**3. Build for Production:**

```bash
npm run build
```

**4. Lint the Code:**

```bash
npm run lint
```

## Development Conventions

*   **Styling:** The project uses Tailwind CSS with Shadcn UI components. Custom styles are defined in `src/app/globals.css`.
*   **State Management:** Zustand is used for client-side state management of the *current* story. The main store is defined in `src/lib/convex-store.ts`.
*   **AI Suggestions:** The AI suggestions are currently hardcoded placeholders in `src/lib/ai-suggestions.ts`. The `getRandomSuggestion` function is used to retrieve a random suggestion for a given story beat.
*   **Database:** The database schema is defined in `convex/schema.ts`. It defines a single table, `stories`, which stores all the information about a story, linked to a user via `userId`.
*   **Authentication:** User management is handled by Clerk. UI components like `<SignedIn>` and `<SignedOut>` are used to control what users see.
*   **Routing:** The application uses the Next.js App Router. The main pages are:
    *   `/`: The landing page, showing recent projects for logged-in users.
    *   `/framework`: The framework selection page (currently only Hero's Journey is available).
    *   `/story`: The main story builder/editor page.
    *   `/projects`: A page to view all of a user's stories.
*   **Components:** Reusable UI components are located in `src/components/ui`. The main application components are in `src/components`.
*   **Local vs. Remote Stories:** The application supports both local stories (for logged-out users) and remote stories (for logged-in users). Local stories have an ID starting with `local_` and are saved in the browser's local storage. Remote stories are saved in Convex.