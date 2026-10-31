# LIA (Locked In Answer)

A gamified quiz app where you bet on your own knowledge. Answer a question, then "lock in" how confident you are (1–5). Higher confidence earns bigger points when you're right and hurts more when you're wrong.

> **Status:** Discontinued. This project is no longer maintained. The code is shared as-is for reference and learning.

## Features

- **Confidence scoring:** Every answer is paired with a 1–5 confidence rating that multiplies the points won or lost.
- **Penalty modes:** Soft (lose points), Hard (lose your streak), or Sudden Death (the run ends).
- **Daily Redemption:** A review challenge auto-built from your missed questions, prioritizing high-confidence mistakes.
- **Challenge creation:** Build quizzes with timers, leaderboards, and penalty settings, then publish them.
- **Profile and stats:** Accuracy, confidence calibration, streaks, and history, with privacy controls for embarrassing results.
- **Leaderboards:** Global or friends, daily or weekly.
- **Feedback effects:** Animations and sound for correct, wrong, and high-confidence answers.

## Tech stack

- React 19 + TypeScript
- Vite
- React Router
- Tailwind CSS and Framer Motion
- Supabase (Postgres, auth, and data access)
- Howler.js and canvas-confetti for sound and effects

## Project layout

```
docs/                  Product requirements (PRD)
web/                   The app (Vite + React + TypeScript)
  src/
    pages/             Route-level screens (Play, Create, Leaderboard, ...)
    components/        Shared UI and layout components
    context/           Auth, app data, and gameplay HUD providers
    lib/               Supabase data access (challenges, sessions, attempts, redemption)
    utils/             Scoring, stats, feedback, and session helpers
  supabase/
    migrations/        Database schema
```

Additional planning and API notes live in `web/` as Markdown files, including `API_REFERENCE.md` and `MIGRATION_GUIDE.md`.

## Getting started

### Prerequisites

- A current Node.js LTS release (Vite 8 requires a recent version)
- A [Supabase](https://supabase.com) project

### 1. Set up the database

Run the SQL in `web/supabase/migrations/` against your Supabase project. You can paste it into the SQL editor in the Supabase dashboard.

### 2. Configure environment variables

Create `web/.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
# Optional: used for the auth redirect fallback in production
VITE_APP_URL=http://localhost:5173
```

Use only the **anon** key here. Never put a `service_role` key in the frontend or in this repo.

### 3. Install and run

```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173.

### Other scripts

Run these from `web/`:

| Command           | What it does              |
| ----------------- | ------------------------- |
| `npm run build`   | Type-check and build      |
| `npm run preview` | Serve the production build |
| `npm run lint`    | Run ESLint                |

## Deployment

The app is a static Vite build. `web/vercel.json` rewrites all routes to `index.html` so client-side routing works. Set the same `VITE_*` environment variables in your host's dashboard.

## License

This project is licensed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](LICENSE) (CC BY-NC-SA 4.0). You may share and adapt it for noncommercial purposes if you credit the author and license your derivatives the same way.
