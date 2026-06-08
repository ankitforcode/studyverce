import {
  GLOBAL_IP_RATE_LIMIT,
  resolveEndpointConfig,
  shouldRateLimitRequest,
  type RateLimitRule,
} from "./config";
import { getRateLimitRedis, isRateLimitEnabled } from "./redis";

export type RateLimitCheckInput = {
  ip: string;
  method: string;
  pathname: string;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
  endpointId: string;
  skipped?: boolean;
};

function normalizeIp(ip: string): string {
  const trimmed = ip.trim() || "unknown";
  return trimmed.replace(/[^a-zA-Z0-9.:_-]/g, "_").slice(0, 128);
}

function failOpen(endpointId: string): RateLimitResult {
  return {
    allowed: true,
    limit: 0,
    remaining: 0,
    resetAt: 0,
    retryAfterSec: 0,
    endpointId,
    skipped: true,
  };
}

function failClosed(endpointId: string, rule: RateLimitRule): RateLimitResult {
  const resetAt = Date.now() + rule.windowSeconds * 1000;
  return {
    allowed: false,
    limit: rule.limit,
    remaining: 0,
    resetAt,
    retryAfterSec: rule.windowSeconds,
    endpointId,
  };
}

function windowStartSec(nowMs: number, windowSeconds: number): number {
  const nowSec = Math.floor(nowMs / 1000);
  return Math.floor(nowSec / windowSeconds) * windowSeconds;
}

function resetAtForWindow(windowStartSec: number, windowSeconds: number): number {
  return (windowStartSec + windowSeconds) * 1000;
}

function bucketKey(prefix: string, ip: string, id: string, windowStartSec: number): string {
  return `${prefix}:${ip}:${id}:${windowStartSec}`;
}

/** One EVAL: INCR both buckets; EXPIRE only on first hit (no TTL round-trip). */
const RATE_LIMIT_SCRIPT = `
local e = redis.call('INCR', KEYS[1])
if e == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local g = redis.call('INCR', KEYS[2])
if g == 1 then
  redis.call('EXPIRE', KEYS[2], ARGV[2])
end
return {e, g}
`;

async function consumeBuckets(
  redis: import("ioredis").default,
  endpointKey: string,
  globalKey: string,
  rule: RateLimitRule,
  globalRule: RateLimitRule,
  endpointResetAt: number,
  globalResetAt: number
): Promise<{
  endpoint: { allowed: boolean; count: number; resetAt: number };
  global: { allowed: boolean; count: number; resetAt: number };
}> {
  const result = (await redis.eval(
    RATE_LIMIT_SCRIPT,
    2,
    endpointKey,
    globalKey,
    String(rule.windowSeconds),
    String(globalRule.windowSeconds)
  )) as [number, number];

  const endpointCount = Number(result[0]);
  const globalCount = Number(result[1]);

  return {
    endpoint: {
      allowed: endpointCount <= rule.limit,
      count: endpointCount,
      resetAt: endpointResetAt,
    },
    global: {
      allowed: globalCount <= globalRule.limit,
      count: globalCount,
      resetAt: globalResetAt,
    },
  };
}

function shouldFailClosed(): boolean {
  return process.env.RATE_LIMIT_FAIL_CLOSED === "true";
}

/**
 * Fixed-window rate limit per IP + endpoint, plus a global per-IP cap.
 */
export async function checkRateLimit(
  input: RateLimitCheckInput
): Promise<RateLimitResult> {
  const { endpointId, rule } = resolveEndpointConfig(input.method, input.pathname);
  const ip = normalizeIp(input.ip);

  if (!isRateLimitEnabled() || !shouldRateLimitRequest(input.method, input.pathname)) {
    return failOpen(endpointId);
  }

  const redis = await getRateLimitRedis();
  if (!redis) {
    return shouldFailClosed() ? failClosed(endpointId, rule) : failOpen(endpointId);
  }

  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }

    const now = Date.now();
    const endpointWindowStart = windowStartSec(now, rule.windowSeconds);
    const globalWindowStart = windowStartSec(now, GLOBAL_IP_RATE_LIMIT.windowSeconds);
    const endpointKey = bucketKey("rl", ip, `ep:${endpointId}`, endpointWindowStart);
    const globalKey = bucketKey("rl", ip, "global", globalWindowStart);
    const endpointResetAt = resetAtForWindow(endpointWindowStart, rule.windowSeconds);
    const globalResetAt = resetAtForWindow(
      globalWindowStart,
      GLOBAL_IP_RATE_LIMIT.windowSeconds
    );

    const { endpoint: endpointResult, global: globalResult } = await consumeBuckets(
      redis,
      endpointKey,
      globalKey,
      rule,
      GLOBAL_IP_RATE_LIMIT,
      endpointResetAt,
      globalResetAt
    );

    const allowed = endpointResult.allowed && globalResult.allowed;
    const limiting = endpointResult.allowed ? globalResult : endpointResult;
    const activeLimit = endpointResult.allowed ? GLOBAL_IP_RATE_LIMIT.limit : rule.limit;

    const remaining = Math.max(activeLimit - limiting.count, 0);
    const retryAfterSec = Math.max(
      Math.ceil((limiting.resetAt - Date.now()) / 1000),
      1
    );

    return {
      allowed,
      limit: activeLimit,
      remaining: allowed ? remaining : 0,
      resetAt: limiting.resetAt,
      retryAfterSec,
      endpointId,
    };
  } catch (err) {
    console.error("[rate-limit] check failed:", err);
    return shouldFailClosed() ? failClosed(endpointId, rule) : failOpen(endpointId);
  }
}

export function getClientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const cfIp = headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  return "unknown";
}
