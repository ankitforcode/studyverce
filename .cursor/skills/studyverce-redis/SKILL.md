---
name: studyverce-redis
description: StudyVerce Redis usage — Upstash budget, rate limiting, socket-server caches, listing/post-it keys, and command optimization. Use when editing packages/redis, packages/rate-limit, apps/socket-server redis-cache, or REDIS_TTL/budget knobs.
---

# StudyVerce Redis & rate limits

See [reference.md](reference.md) for keys, TTLs, and file map.

## Budget

Targets: **256 MB**, **500k commands/month** (`REDIS_BUDGET` in `packages/redis/src/keys.ts`). Monitor Upstash after deploys.

## Rate limiting (`packages/rate-limit`)

- **One EVAL per limited request** — dual bucket (endpoint + global) in single Lua script.
- Lua uses `INCR` + `EXPIRE` on first hit only — **no `TTL` inside script** (was major command waste).
- Time-bucket keys: `rl:{ip}:ep:{id}:{windowStart}` — reset time computed in JS.
- **`shouldRateLimitRequest()`** — skip Redis for `/presence` and unconfigured paths; limit `/api/*` + explicit endpoints only.
- Socket express middleware skips `/socket.io`; `/presence` skips rate limit entirely.

**Do not** re-add per-request double `eval`, TTL calls in Lua, or rate-limit `/presence`.

## Socket server caches (`apps/socket-server/src/redis-cache.ts`)

| Pattern | Use |
|---------|-----|
| `GET` / `SET EX` | Profile, room auth, music, active count |
| `MGET` | **`getCachedActiveCountsBatch`** — `/presence` polls (one round trip) |
| `pipeline` | Chat append, participant writes |
| `SMEMBERS` | Participant room index (avoid `SCAN` on sweeps) |

Active count TTL: **15s** (`REDIS_TTL.activeCountSeconds`).

## Web app Redis

- Listing cache: `apps/web/src/lib/cache/listing.ts` (120s TTL)
- Post-it lazy persist: `apps/web/src/lib/post-it-cache/` — debounced flush
- Shared client: `packages/redis` lazy connect; `@/lib/redis` side-effect import where needed

## Pitfalls

1. Polling endpoints + rate limit = command explosion (EVAL/INCR/TTL spikes in Upstash).
2. N parallel `GET`s for N room IDs — use `MGET` batch helpers.
3. `SOCKET_REDIS_ADAPTER=true` on single ECS task wastes pub/sub commands — enable only when scaling past one task.
4. Lowering active-count TTL below 15s increases `/presence` load.

## After changes — verify

Complete the checklist in `.cursor/rules/skills-maintenance.mdc` plus:

- [ ] Estimate command impact for hot paths (presence poll, rate-limited APIs)
- [ ] Update `README.md` Redis budget table if defaults change
- [ ] Update this skill + `reference.md`
- [ ] `pnpm --filter @studyverce/rate-limit exec tsc --noEmit` when touching rate-limit
