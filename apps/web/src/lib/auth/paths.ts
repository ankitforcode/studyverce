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

/** Internal app paths only — blocks open redirects and auth loops. */
export function safeRedirectPath(path: string | null | undefined): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;

  try {
    const url = new URL(path, "http://localhost");
    if (!url.pathname.startsWith("/")) return null;
    if (url.pathname.startsWith("/auth/")) return null;
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
  const destination = safe ?? "/dashboard";

  if (!onboardingCompleted && destination !== "/onboarding") {
    return onboardingPath(destination);
  }

  return destination;
}
