export function loginPath(redirectTo: string): string {
  return `/auth/login?redirect=${encodeURIComponent(redirectTo)}`;
}

export function signupPath(redirectTo: string): string {
  return `/auth/signup?redirect=${encodeURIComponent(redirectTo)}`;
}
