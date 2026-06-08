import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Auth/session only — rate limiting runs in API Route Handlers (Node), not here. */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

/** Keep in sync with `isProtectedAppPath()` in `@/lib/auth/middleware-routes`. */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/rooms/new",
    "/rooms/:slug",
    "/rooms/:slug/invite",
    "/admin/:path*",
    "/friends",
    "/notifications",
    "/onboarding",
    "/auth/:path*",
  ],
};
