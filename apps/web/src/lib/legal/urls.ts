import { getSiteUrl } from "@/lib/site-metadata";

/** Public legal page paths — keep in sync with Google OAuth consent screen URLs. */
export const PRIVACY_POLICY_PATH = "/privacy";
export const TERMS_OF_SERVICE_PATH = "/terms";

export function privacyPolicyPath(): string {
  return PRIVACY_POLICY_PATH;
}

export function termsOfServicePath(): string {
  return TERMS_OF_SERVICE_PATH;
}

export function privacyPolicyUrl(origin = getSiteUrl()): string {
  return `${origin}${PRIVACY_POLICY_PATH}`;
}

export function termsOfServiceUrl(origin = getSiteUrl()): string {
  return `${origin}${TERMS_OF_SERVICE_PATH}`;
}
