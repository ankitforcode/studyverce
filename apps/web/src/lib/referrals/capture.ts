export const REFERRAL_COOKIE_NAME = "sv_ref";
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed.length > 30) return null;
  if (!/^[a-z0-9_]+$/.test(trimmed)) return null;
  return trimmed;
}

export function readReferralCodeFromSearchParams(
  searchParams: URLSearchParams | { get(name: string): string | null }
): string | null {
  return normalizeReferralCode(searchParams.get("ref"));
}

export function buildReferralSignupPath(referralCode: string, redirect?: string): string {
  const params = new URLSearchParams({ ref: referralCode });
  if (redirect) params.set("redirect", redirect);
  return `/auth/signup?${params.toString()}`;
}

export function buildReferralLink(appOrigin: string, referralCode: string): string {
  const url = new URL("/auth/signup", appOrigin);
  url.searchParams.set("ref", referralCode);
  return url.toString();
}
