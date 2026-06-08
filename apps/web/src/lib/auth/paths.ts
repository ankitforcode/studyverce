import { getAppOrigin } from "@/lib/site-metadata";

/** Auth routes that are valid post-login redirect targets (e.g. password recovery). */
const ALLOWED_AUTH_REDIRECT_PATHS = new Set([
  "/auth/reset-password",
  "/auth/accept-invite",
]);

export function authCallbackUrl(redirectTo: string): string {
  const safe = safeRedirectPath(redirectTo) ?? "/onboarding";
  return `${getAppOrigin()}/auth/callback?next=${encodeURIComponent(safe)}`;
}

/** Supabase invite emails should land here (not `/auth/callback`) so the client can finish PKCE/hash exchange. */
export function acceptInviteUrl(): string {
  return `${getAppOrigin()}/auth/accept-invite`;
}

export function loginPath(redirectTo: string): string {
  return `/auth/login?redirect=${encodeURIComponent(redirectTo)}`;
}

export function signupPath(redirectTo: string): string {
  return `/auth/signup?redirect=${encodeURIComponent(redirectTo)}`;
}

export function forgotPasswordPath(redirectTo?: string): string {
  if (!redirectTo) return "/auth/forgot-password";
  return `/auth/forgot-password?redirect=${encodeURIComponent(redirectTo)}`;
}

export function accountSettingsPath(notice?: string): string {
  if (!notice) return "/settings/account";
  return `/settings/account?${notice}`;
}

export function reauthenticatePath(redirectTo?: string): string {
  const safe = safeRedirectPath(redirectTo) ?? "/settings/account";
  return `/auth/reauthenticate?redirect=${encodeURIComponent(safe)}`;
}

/** Internal app paths only — blocks open redirects and auth loops. */
export function safeRedirectPath(path: string | null | undefined): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;

  try {
    const url = new URL(path, "http://localhost");
    if (!url.pathname.startsWith("/")) return null;
    if (url.pathname.startsWith("/auth/") && !ALLOWED_AUTH_REDIRECT_PATHS.has(url.pathname)) {
      return null;
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export function isRoomInvitePath(path: string): boolean {
  return /^\/rooms\/[^/]+\/invite(?:\?|$)/.test(path);
}

export function onboardingPath(redirectTo?: string | null): string {
  const safe = safeRedirectPath(redirectTo);
  if (!safe || safe === "/onboarding") return "/onboarding";
  return `/onboarding?redirect=${encodeURIComponent(safe)}`;
}

/** After sign-in / OAuth: onboarding first when profile setup is incomplete. */
export function resolvePostAuthDestination(
  redirectTo: string | null | undefined,
  onboardingCompleted: boolean
): string {
  const safe = safeRedirectPath(redirectTo);

  if (safe === "/auth/reset-password" || safe === "/auth/accept-invite") {
    return safe;
  }

  const destination = safe ?? "/dashboard";

  if (safe && isRoomInvitePath(safe)) {
    return safe;
  }

  if (!onboardingCompleted && destination !== "/onboarding") {
    return onboardingPath(destination);
  }

  return destination;
}
