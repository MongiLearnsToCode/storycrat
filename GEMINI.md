# GEMINI.md

## Project Overview

This is a Next.js application called StoryCrat that provides writers with a structured, guided environment for story creation using multiple narrative frameworks. The app supports both local and cloud-based story storage, character management, progress tracking, and export functionality.

**Key Technologies:**

*   **Framework:** Next.js 15 (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS with Shadcn UI
*   **State Management:** Zustand (dual stores for local and remote state)
*   **Authentication:** Clerk
*   **Backend & Database:** Convex
*   **UI Components:** Radix UI primitives
*   **Icons:** Lucide React and Tabler Icons
*   **Forms:** React Hook Form with Zod validation
*   **Charts:** Recharts
*   **PDF Export:** jsPDF
*   **Date Handling:** date-fns

**Architecture:**

The application uses the Next.js App Router with a dual-state management system:

- **Local State (`src/lib/store.ts`)**: Handles unauthenticated users with local storage persistence
- **Remote State (`src/lib/convex-store.ts`)**: Manages authenticated users with Convex backend

The database schema is defined in `convex/schema.ts` with a single `stories` table containing story metadata, beats, and characters. Server-side logic is handled by Convex functions in `convex/stories.ts`.

## Building and Running

**1. Install Dependencies:**

```bash
npm install
```

**2. Run the Development Server:**

```bash
npm run dev --turbopack
```

The application will be available at [http://localhost:3000](http://localhost:3000).

**3. Build for Production:**

```bash
npm run build --turbopack
```

**4. Lint the Code:**

```bash
npm run lint
```

## Development Conventions

*   **Styling:** The project uses Tailwind CSS with Shadcn UI components. Custom styles are defined in `src/app/globals.css`.
*   **State Management:** Dual Zustand stores handle local (`store.ts`) and remote (`convex-store.ts`) state management. Local stories use browser storage, remote stories sync with Convex.
*   **Database:** The database schema is defined in `convex/schema.ts`. It defines a single table, `stories`, which stores all story information including beats and characters, linked to users via `userId`.
*   **Authentication:** User management is handled by Clerk. The app supports both authenticated and anonymous users.
*   **Routing:** The application uses the Next.js App Router. The main pages are:
    *   `/`: Landing page with hero section and navigation
    *   `/projects`: User dashboard with story insights and character management
    *   `/framework`: Framework selection page (Hero's Journey, Three-Act Structure, etc.)
    *   `/story`: Main story builder/editor page with beat-by-beat writing
    *   `/projects`: Project management page (redirects to dashboard)
    *   `/sign-in`, `/sign-up`: Authentication pages
*   **Components:** Reusable UI components are located in `src/components/ui`. Application-specific components are in `src/components`.
*   **Local vs. Remote Stories:** The application supports both local stories (for logged-out users) and remote stories (for logged-in users). Local stories are saved in browser localStorage, remote stories are persisted in Convex.
*   **Export Functionality:** Stories can be exported as TXT or PDF files using utilities in `src/lib/export-utils.ts` and `src/lib/pdf-export.ts`.
*   **Character Management:** Detailed character profiles with name, role, description, appearance, and backstory fields.
*   **Progress Tracking:** Visual progress indicators and completion tracking for story beats.
*   **Themes:** Support for light/dark themes using next-themes.