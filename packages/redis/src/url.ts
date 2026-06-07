export type ResolveRedisUrlOptions = {
  /** When true, throw if Redis is required but not configured (production socket-server). */
  requiredInProduction?: boolean;
  /** Fallback URL for local development when nothing is configured. */
  localFallback?: string;
};

export function resolveRedisUrl(options: ResolveRedisUrlOptions = {}): string {
  const host = process.env.REDIS_HOST?.trim();
  const port = process.env.REDIS_PORT?.trim() || "6379";
  if (host) {
    return `redis://${host}:${port}`;
  }

  const url = process.env.REDIS_URL?.trim();
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname) return url;
    } catch {
      // fall through
    }
  }

  if (options.requiredInProduction && process.env.NODE_ENV === "production") {
    throw new Error(
      "Redis is not configured. Set REDIS_HOST and REDIS_PORT (ECS/CDK) or REDIS_URL (local)."
    );
  }

  return options.localFallback ?? "redis://localhost:6379";
}

export function redactRedisUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return "<invalid-redis-url>";
  }
}
