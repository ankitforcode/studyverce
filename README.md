# StudyVerce

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
studyverce/
├── apps/
│   ├── web/              # Next.js frontend
│   └── socket-server/    # Socket.IO real-time server
├── packages/
│   ├── shared/           # Shared types and constants
│   ├── db/               # Database types and Zod schemas
│   └── ai/               # AI feature stubs (Phase 2)
└── supabase/
    ├── migrations/       # PostgreSQL schema + RLS (single baseline file)
    └── seed.sql          # Reference data + local admin user
```

## Getting Started

### Prerequisites

- Node.js 25.8.1+
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
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SOCKET_URL=http://localhost:3002
NEXT_PUBLIC_POSTHOG_KEY=           # optional
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
# Rate limiting (same Redis as socket-server; optional — fails open if unset)
REDIS_URL=redis://localhost:6379
# RATE_LIMIT_ENABLED=false
# RATE_LIMIT_FAIL_CLOSED=true
```

**apps/socket-server/.env** (copy from example — **required** for “Live” in rooms)

```bash
cp apps/socket-server/.env.example apps/socket-server/.env
# Local: paste JWT secret from `supabase status` → JWT Secret
```

```bash
PORT=3002
REDIS_URL=redis://localhost:6379
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase-status
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
CORS_ORIGIN=http://localhost:3001
```

`pnpm dev` starts **web** (3001) and **socket-server** (3002). If the room shows **Offline**, check the terminal for `@studyverce/socket-server` and that `SUPABASE_JWT_SECRET` matches your Supabase project.

Room realtime uses Socket.io through the **same origin** as the web app (`/socket.io` → Next.js rewrite → port 3002). You do not need a separate ngrok tunnel for the socket server unless you set `NEXT_PUBLIC_SOCKET_URL` explicitly.

Find your JWT secret in Supabase Dashboard → Settings → API → JWT Secret.

### 3. Run database migrations

Apply schema via Supabase CLI (`supabase/migrations/20250602000000_studyverce_schema.sql`) and reference data via `supabase/seed.sql`:

```bash
# Local: full reset (schema + seed)
supabase db reset

# Remote: schema only (seed is local dev; run seed SQL manually if needed)
supabase db push
```

If you had the old multi-file migrations applied locally, run `supabase db reset` once so migration history matches the squashed baseline.

#### Local admin user (seed)

After `supabase db reset`, sign in with the seeded admin account:

| Field | Value |
|-------|--------|
| Email | `admin@studyverce.local` |
| Password | `StudyVerceAdmin123!` |

The user has `profiles.is_admin = true`, `plan_tier = institution`, and onboarding completed. **Do not use this password outside local development.**

#### Auth email templates (local)

| Template | File | Supabase config key | Preview flow |
|----------|------|---------------------|--------------|
| Confirm signup | `supabase/templates/confirm-signup.html` | `[auth.email.template.confirmation]` | Sign up at `/auth/signup` |
| Reset password | `supabase/templates/reset-password.html` | `[auth.email.template.recovery]` | Request reset at `/auth/forgot-password` |

Both templates share the inline book logo (generated from `apps/web/public/logo-email.svg`).

Regenerate the PNG after editing the SVG:

```bash
./scripts/sync-email-logo.sh
```

Then update the inline `data:image/png;base64,...` in both HTML templates if the icon changed.

1. Restart Supabase after editing a template: `supabase stop --no-backup && supabase start`
2. Trigger the flow above with a test email
3. Open **Inbucket** at [http://localhost:54324](http://localhost:54324) to preview the message

For hosted Supabase, paste the HTML into **Authentication → Email Templates** (**Confirm signup** / **Reset password**) in the dashboard.

### 4. Start Redis and ngrok (OAuth / HTTPS redirects)

Copy the **repo root** env file (this is separate from `apps/web/.env.local`) and add your [ngrok authtoken](https://dashboard.ngrok.com/get-started/your-authtoken):

```bash
cp .env.example .env
# Edit .env at the repo root:
#   NGROK_AUTHTOKEN=your_token
#   NGROK_DOMAIN=patient-pika-evident.ngrok-free.app   # your reserved domain
```

Start the web app first (`pnpm dev` on port 3001), then start the tunnel:

```bash
docker compose up -d redis ngrok
docker compose logs ngrok   # should show "Starting ngrok on domain ..."
```

If you see **ERR_NGROK_3200 endpoint is offline**, the ngrok container is not running — usually a missing `NGROK_AUTHTOKEN` in root `.env`. Fix `.env` and run `docker compose up -d ngrok` again.

- Ngrok inspector: [http://127.0.0.1:4040](http://127.0.0.1:4040)
- Print the public HTTPS URL (after `pnpm dev` is running on port 3001):

```bash
./scripts/ngrok-public-url.sh
```

Set that URL in **apps/web/.env.local** so music OAuth callbacks work (restart `pnpm dev` after changing):

```bash
NEXT_PUBLIC_APP_URL=https://your-subdomain.ngrok-free.app
```

`next.config.ts` reads that host into `allowedDevOrigins` so HMR works through ngrok. Use the **ngrok URL only** in the browser (not `localhost:3001`) and sign in there before connecting streaming accounts — otherwise the OAuth callback returns `?error=music_auth` because Supabase session cookies are on a different host.

Register the same base URL + callback paths in each provider dashboard, for example:

- Spotify: `{NEXT_PUBLIC_APP_URL}/api/music/spotify/callback`
- Google (YouTube Music): `{NEXT_PUBLIC_APP_URL}/api/music/youtube_music/callback`

#### Google / YouTube Music (fix `403 access_denied`)

In [Google Cloud Console](https://console.cloud.google.com/) for the project that owns `GOOGLE_CLIENT_ID`:

1. **APIs & Services → Library** — enable **YouTube Data API v3**.
2. **APIs & Services → Credentials** — create an **OAuth 2.0 Client ID** (type **Web application**).
   - **Authorized JavaScript origins**: `https://your-subdomain.ngrok-free.app` (your `NEXT_PUBLIC_APP_URL`, no trailing slash)
   - **Authorized redirect URIs**: `https://your-subdomain.ngrok-free.app/api/music/youtube_music/callback`
3. **APIs & Services → OAuth consent screen**
   - **User type**: External (or Internal for Workspace-only)
   - **Publishing status**: Testing (normal for dev)
   - **Test users**: add every Google account that will connect (e.g. `luv.ankit@gmail.com`). Without this, Google shows *“Access blocked … has not completed the Google verification process”* (`403 access_denied`).
4. Put the client ID and secret in `apps/web/.env.local` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then restart `pnpm dev`.

Use the **same** OAuth client as Supabase Google login only if redirect URIs for both are listed on that client; otherwise create a separate client for music.

For a **stable** redirect URL on each restart, reserve a domain in ngrok and set `NGROK_DOMAIN=your-subdomain.ngrok-free.app` in `.env`.

Also add the ngrok URL under Supabase **Authentication → URL configuration → Redirect URLs** if you sign in through the tunnel.

Add the same ngrok HTTPS origin to **apps/socket-server/.env** `CORS_ORIGIN` (comma-separated with `http://localhost:3001`) so the room shows **Live** instead of stuck on **Connecting…**.

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
- AI study planner, flashcards, quizzes (`@studyverce/ai` package)
- Social features (friendships, study groups, challenges)
- Premium billing via Stripe
- React Native mobile app

## Deployment

| Service | Host |
|---------|------|
| Next.js web | **AWS Amplify** (`amplify.yml`, app root `apps/web`) |
| Socket.IO server | **AWS ECS Fargate** (CDK in `infra/`) |
| Redis | **Upstash** (SSM `/socket/production/redis_url` → ECS; same URL in Amplify `REDIS_URL`) |
| Auth + Postgres + Storage | **Supabase Cloud** |

See [`infra/README.md`](infra/README.md) for CDK bootstrap, secrets, and GitHub Actions (`/.github/workflows/deploy-aws.yml`).

### Redis budget (Upstash)

Production targets **256 MB storage** and **500k commands/month** (`REDIS_BUDGET` in `packages/redis/src/keys.ts`). Defaults are tuned for that:

| Knob | Default | Why |
|------|---------|-----|
| `SOCKET_REDIS_ADAPTER` | `false` on ECS (`desiredCount: 1`) | Skips Socket.IO pub/sub through Redis — largest command saver. Set `true` before scaling ECS past one task. |
| Presence sweep | 60s | Was 15s — fewer `HGETALL` sweeps. |
| Active count cache | 15s | Was 3s — fewer `/presence` Redis reads. |
| Listing cache | 120s | Was 45s — room list invalidates on mutations. |
| Post-it lazy flush | 2000ms debounce | Batches drag/resize writes. |
| Participant / music keys | TTL + room index SET | Keys expire; sweeps use `SMEMBERS` instead of `SCAN`. |
| Rate limits | Lua `INCR`+`EXPIRE` script | 1 command per bucket check instead of up to 4. |

Monitor usage in the Upstash console. If you approach the cap, raise debounce/TTL values or disable `RATE_LIMIT_ENABLED` on Amplify (socket server still rate-limits).

## Scripts

```bash
pnpm dev          # Start all apps in dev mode
pnpm build        # Build all apps
pnpm lint         # Lint all apps
pnpm typecheck    # Type-check all packages
```

## License

Private — All rights reserved.
