import {
  GLOBAL_IP_RATE_LIMIT,
  resolveEndpointConfig,
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

async function consumeBucket(
  redis: import("ioredis").default,
  key: string,
  rule: RateLimitRule
): Promise<{ allowed: boolean; count: number; resetAt: number }> {
  const ttl = rule.windowSeconds;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, ttl);
  } else {
    const remainingTtl = await redis.ttl(key);
    if (remainingTtl < 0) {
      await redis.expire(key, ttl);
    }
  }

  const ttlSeconds = await redis.ttl(key);
  const resetAt = Date.now() + Math.max(ttlSeconds, 1) * 1000;

  return {
    allowed: count <= rule.limit,
    count,
    resetAt,
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

  if (!isRateLimitEnabled()) {
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

    const endpointKey = `rl:${ip}:ep:${endpointId}`;
    const globalKey = `rl:${ip}:global`;

    const [endpointResult, globalResult] = await Promise.all([
      consumeBucket(redis, endpointKey, rule),
      consumeBucket(redis, globalKey, GLOBAL_IP_RATE_LIMIT),
    ]);

    const allowed = endpointResult.allowed && globalResult.allowed;
    const limiting = endpointResult.allowed ? globalResult : endpointResult;
    const activeRule = endpointResult.allowed ? GLOBAL_IP_RATE_LIMIT : rule;
    const activeLimit = endpointResult.allowed
      ? GLOBAL_IP_RATE_LIMIT.limit
      : rule.limit;

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
