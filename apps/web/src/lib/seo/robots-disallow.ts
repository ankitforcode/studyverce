/**
 * Paths crawlers should not index. Keep aligned with protected app routes
 * (`lib/auth/middleware-routes.ts`) plus auth/onboarding flows.
 */
export const ROBOTS_DISALLOW_PATHS = [
  "/dashboard/",
  "/settings/",
  "/admin/",
  "/auth/",
  "/onboarding",
  "/friends",
  "/notifications",
  "/profile/",
  "/rooms/new",
  "/rooms/",
] as const;
