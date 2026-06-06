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
