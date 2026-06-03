import type { NextFunction, Request, Response } from "express";
import { checkRateLimit, type RateLimitResult } from "./limiter";

function getClientIpFromExpress(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).trim();
  }

  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) return realIp.trim();

  return req.socket.remoteAddress ?? "unknown";
}

function applyRateLimitHeaders(res: Response, result: RateLimitResult): void {
  if (result.skipped) return;
  res.setHeader("X-RateLimit-Limit", String(result.limit));
  res.setHeader("X-RateLimit-Remaining", String(result.remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
}

/**
 * Express middleware — rate limits by client IP and request path.
 */
export function expressRateLimitMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const pathname = req.path || "/";
    if (pathname.startsWith("/socket.io")) {
      next();
      return;
    }
    const result = await checkRateLimit({
      ip: getClientIpFromExpress(req),
      method: req.method,
      pathname,
    });

    applyRateLimitHeaders(res, result);

    if (!result.allowed) {
      res.setHeader("Retry-After", String(result.retryAfterSec));
      res.status(429).json({
        error: "Too many requests",
        retryAfter: result.retryAfterSec,
      });
      return;
    }

    next();
  };
}
