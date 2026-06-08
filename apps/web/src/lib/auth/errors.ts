/** User-facing copy for Supabase magic-link sign-in failures. */
export function formatMagicLinkLoginError(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("signups not allowed for otp") ||
    lower.includes("user not found") ||
    lower.includes("no user found")
  ) {
    return "No account exists for this email. Sign up first, or double-check the address.";
  }

  if (lower.includes("email rate limit") || lower.includes("rate limit")) {
    return "Too many sign-in emails sent. Wait a few minutes and try again.";
  }

  return message;
}
