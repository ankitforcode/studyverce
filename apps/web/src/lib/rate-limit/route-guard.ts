import { enforceRateLimit } from "@/lib/rate-limit";

/** Call at the top of API Route Handlers. Returns a 429 Response when limited. */
export async function rateLimitOrNull(request: Request): Promise<Response | null> {
  return enforceRateLimit(request);
}
