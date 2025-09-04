# GEMINI.md

## Project Overview

This is a Next.js application called StoryGenPro that provides writers with a structured, guided environment for story creation using the Hero's Journey framework with AI-assisted suggestions.

**Key Technologies:**

*   **Framework:** Next.js
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS with Shadcn UI
*   **State Management:** Zustand
*   **Backend:** Convex

**Architecture:**

The application uses the Next.js App Router. Client-side state is managed with Zustand and persisted to local storage. The backend is powered by Convex, which provides a real-time database and serverless functions. The database schema is defined in `convex/schema.ts`.

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
*   **State Management:** Zustand is used for client-side state management. The main store is defined in `src/lib/store.ts`. A separate store for Convex is in `src/lib/convex-store.ts`.
*   **AI Suggestions:** The AI suggestions are currently hardcoded in `src/lib/ai-suggestions.ts`. The `getRandomSuggestion` function is used to retrieve a random suggestion for a given story beat.
*   **Database:** The database schema is defined in `convex/schema.ts`. It defines a single table, `stories`, which stores all the information about a story.
*   **Routing:** The application uses the Next.js App Router. The main pages are:
    *   `/`: The landing page.
    *   `/framework`: The framework selection page.
    *   `/story`: The story builder page.
    *   `/projects`: The projects list page.
*   **Components:** UI components are located in `src/components/ui`. The `sidebar.tsx` component is a reusable sidebar that can be used in different parts of the application.
