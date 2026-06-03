import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Auth/session only — rate limiting runs in API Route Handlers (Node), not here. */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
