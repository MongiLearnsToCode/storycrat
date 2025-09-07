# StoryCrat - Structured Storytelling with AI

A Next.js application that provides writers with a structured, guided environment for story creation using the Hero's Journey framework with AI-assisted suggestions.

## Features

- **Framework-Guided Writing**: Hero's Journey structure with 9 story beats
- **AI Suggestions**: Context-aware writing prompts for each story beat
- **Character Management**: Simple character cards with role tracking
- **Auto-Save**: Persistent story progress using Zustand
- **Progress Tracking**: Visual progress indicators
- **Modern UI**: Built with Shadcn UI and modern-minimal theme

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

- `/src/app/` - Next.js app router pages
- `/src/lib/store.ts` - Zustand state management
- `/src/lib/ai-suggestions.ts` - AI suggestion system
- `/src/components/ui/` - Shadcn UI components

## User Flow

1. **Landing Page** → Start Writing CTA
2. **Framework Selection** → Choose Hero's Journey + Enter story title
3. **Story Builder** → Write through structured beats with AI assistance
4. **Character Management** → Add/manage story characters
5. **Projects List** → View and continue saved stories

## Tech Stack

- **Frontend**: Next.js 15 with App Router
- **Styling**: TailwindCSS + Shadcn UI (modern-minimal theme)
- **State**: Zustand with persistence
- **Icons**: Lucide React
- **TypeScript**: Full type safety

## MVP Scope

This is the MVP version focusing on:
- Hero's Journey framework only
- Basic AI suggestions (no external API)
- Local storage persistence
- Core writing workflow

Future enhancements could include:
- Multiple story frameworks
- Real AI integration (Gemini API)
- Export functionality
- User authentication
- Cloud storage
