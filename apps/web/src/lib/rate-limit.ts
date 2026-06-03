import {
  checkRateLimit,
  getClientIpFromHeaders,
  type RateLimitResult,
} from "@studyverce/rate-limit";

/** For Route Handlers — call at the top of public handlers. */
export async function enforceRateLimit(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const result = await checkRateLimit({
    ip: getClientIpFromHeaders(request.headers),
    method: request.method,
    pathname: url.pathname,
  });

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        retryAfter: result.retryAfterSec,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(result.retryAfterSec),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        },
      }
    );
  }

  return null;
}
