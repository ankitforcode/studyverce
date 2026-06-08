const DEFAULT_EMAIL_COOLDOWN_SECONDS = 30;

/** Parse Supabase "wait N seconds" copy; falls back to 30s when missing or zero. */
export function parseAuthEmailCooldownSeconds(message: string): number {
  const match = message.match(/after (\d+) seconds?/i);
  if (!match) return DEFAULT_EMAIL_COOLDOWN_SECONDS;

  const parsed = Number.parseInt(match[1] ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_EMAIL_COOLDOWN_SECONDS;
  }

  return parsed;
}

/** User-facing copy for Supabase email send rate limits. */
export function formatAuthEmailRateLimitError(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("security purposes") ||
    lower.includes("email rate limit") ||
    lower.includes("rate limit") ||
    lower.includes("over_email_send")
  ) {
    const seconds = parseAuthEmailCooldownSeconds(message);
    return `For security purposes, you can only request this again after ${seconds} seconds.`;
  }

  return message;
}

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

  return formatAuthEmailRateLimitError(message);
}
