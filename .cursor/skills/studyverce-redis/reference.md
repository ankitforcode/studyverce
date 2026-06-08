# Redis reference

## Packages

| Path | Role |
|------|------|
| `packages/redis/src/keys.ts` | Key builders, `REDIS_TTL`, `REDIS_BUDGET` |
| `packages/redis/src/client.ts` | Lazy ioredis connect |
| `packages/redis/src/invalidate.ts` | Listing, profile, room auth invalidation |
| `packages/rate-limit/src/limiter.ts` | `checkRateLimit`, optimized Lua |
| `packages/rate-limit/src/config.ts` | Endpoint rules, `shouldRateLimitRequest` |
| `packages/rate-limit/src/express.ts` | Socket server middleware |

## Socket server

| File | Role |
|------|------|
| `apps/socket-server/src/redis-cache.ts` | Caches + `getCachedActiveCountsBatch` |
| `apps/socket-server/src/index.ts` | `/presence`, participant sweep, adapter flag |
| `apps/web/next.config.ts` | Rewrites `/presence` → socket server |

## Key prefixes (sample)

| Key | TTL (default) |
|-----|----------------|
| `profile:{userId}` | 600s |
| `room:auth:*` | 120s |
| `room:{id}:active_count` | 15s |
| `room:{id}:participants` | 2h (refreshed on write) |
| `listing:{scope}` | 120s |
| `rl:{ip}:*` | window bucket (60s typical) |

## Env knobs

| Variable | Effect |
|----------|--------|
| `REDIS_URL` | Enables Redis caches + rate limit |
| `RATE_LIMIT_ENABLED=false` | Disables limiter on web (socket still limits) |
| `RATE_LIMIT_FAIL_CLOSED=true` | Deny when Redis unavailable |
| `SOCKET_REDIS_ADAPTER` | Socket.io pub/sub through Redis |
| `POST_IT_FLUSH_DEBOUNCE_MS` | Post-it write batching (default 2000) |

## Docs

| File | Content |
|------|---------|
| Root `README.md` | Redis budget table |
| `infra/README.md` | ECS + Upstash SSM paths |
