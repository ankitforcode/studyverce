/** Routes where middleware refreshes Supabase session and enforces auth redirects. */
export const authMiddlewareMatcher = [
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
] as const;

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
