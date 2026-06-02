# StudyVerse

**Discord for studying** — virtual study rooms, shared Pomodoro timers, real-time chat, and focus tracking.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Auth & DB | Supabase (Auth + PostgreSQL) |
| Real-time | Socket.IO + Redis |
| Analytics | PostHog |
| Monorepo | pnpm workspaces + Turborepo |

## Project Structure

```
studyverse/
├── apps/
│   ├── web/              # Next.js frontend
│   └── socket-server/    # Socket.IO real-time server
├── packages/
│   ├── shared/           # Shared types and constants
│   ├── db/               # Database types and Zod schemas
│   └── ai/               # AI feature stubs (Phase 2)
└── supabase/
    └── migrations/       # PostgreSQL schema + RLS
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for Redis)
- Supabase project ([supabase.com](https://supabase.com))

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy env examples and fill in your Supabase credentials:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/socket-server/.env.example apps/socket-server/.env
```

**apps/web/.env.local**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SOCKET_URL=http://localhost:3002
NEXT_PUBLIC_POSTHOG_KEY=           # optional
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

**apps/socket-server/.env**
```bash
PORT=3002
REDIS_URL=redis://localhost:6379
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
CORS_ORIGIN=http://localhost:3001
```

Find your JWT secret in Supabase Dashboard → Settings → API → JWT Secret.

### 3. Run database migrations

Apply migrations via Supabase CLI or paste SQL from `supabase/migrations/` into the Supabase SQL editor:

```bash
# With Supabase CLI
supabase db push
```

### 4. Start Redis

```bash
docker compose up -d redis
```

### 5. Start development servers

```bash
pnpm dev
```

- Web app: [http://localhost:3001](http://localhost:3001)
- Socket server: [http://localhost:3002](http://localhost:3002)

## Features (Phase 1)

- **Authentication** — Email/password and Google OAuth via Supabase
- **Virtual Study Rooms** — Public and private rooms with real-time presence
- **Shared Pomodoro Timer** — Server-authoritative timer synced across room members
- **Room Chat** — Real-time messaging with moderation
- **Focus Tracking** — Session logging with streak and total hours
- **Dashboard** — Weekly charts, study calendar heatmap, recent sessions
- **Profiles** — Username, subject tags, streaks, achievements scaffold
- **Room Backgrounds** — Built-in wallpaper library, custom uploads (up to 15 MB), and community-shared backgrounds
- **Leaderboard** — Basic all-time focus rankings

## Phase 2 (Scaffolded)

- LiveKit video/audio rooms (`RoomVideo` component stub)
- AI study planner, flashcards, quizzes (`@studyverse/ai` package)
- Social features (friendships, study groups, challenges)
- Premium billing via Stripe
- React Native mobile app

## Deployment

| Service | Recommended Host |
|---------|-----------------|
| Next.js web | Vercel |
| Socket.IO server | Fly.io or Railway |
| Redis | Upstash or ElastiCache |
| Supabase | Supabase Cloud |

## Scripts

```bash
pnpm dev          # Start all apps in dev mode
pnpm build        # Build all apps
pnpm lint         # Lint all apps
pnpm typecheck    # Type-check all packages
```

## License

Private — All rights reserved.
