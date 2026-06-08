/** Protected-route logic for Supabase middleware. Matcher paths live in `apps/web/src/middleware.ts` (must be static for Next.js). */
const protectedPathPrefixes = ["/dashboard", "/settings", "/rooms/new", "/admin", "/friends", "/notifications"];

export function isProtectedAppPath(pathname: string): boolean {
  if (protectedPathPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  if (/^\/rooms\/[^/]+$/.test(pathname)) {
    return pathname !== "/rooms/new";
  }

  if (/^\/rooms\/[^/]+\/invite$/.test(pathname)) {
    return true;
  }

  return false;
}
