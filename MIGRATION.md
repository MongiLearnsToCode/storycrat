# Migration to Convex Backend

## What Changed

The app has been migrated from Zustand local storage to Convex backend for better data persistence and real-time capabilities.

## Key Changes

1. **Backend**: Added Convex schema and functions in `/convex/`
2. **Store**: Created new `convex-store.ts` that works with Convex
3. **Components**: Updated all pages to use Convex queries and mutations
4. **Environment**: Added Convex URL configuration

## Files Modified

- `src/app/layout.tsx` - Added ConvexProvider
- `src/app/framework/page.tsx` - Uses Convex mutations
- `src/app/projects/page.tsx` - Uses Convex queries
- `src/app/story/page.tsx` - Uses Convex mutations
- `src/lib/convex-store.ts` - New store for Convex integration

## Files Added

- `convex/schema.ts` - Database schema
- `convex/stories.ts` - Backend functions

## Data Migration

Existing local storage data will not be automatically migrated. Users will need to recreate their stories in the new system.

## Running the App

1. Ensure Convex is running: `npx convex dev`
2. Start Next.js: `npm run dev`
