import {
  DEFAULT_CONSENT_PREFERENCES,
  type ConsentPreferences,
  type StoredConsent,
} from "@/lib/consent/types";

export const CONSENT_STORAGE_KEY = "studyverce-cookie-consent-v1";

export function readStoredConsent(): StoredConsent | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed.version !== 1 || !parsed.preferences) return null;

    return {
      version: 1,
      preferences: {
        necessary: true,
        analytics: Boolean(parsed.preferences.analytics),
        marketing: Boolean(parsed.preferences.marketing),
      },
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function writeStoredConsent(preferences: ConsentPreferences): StoredConsent {
  const stored: StoredConsent = {
    version: 1,
    preferences: {
      necessary: true,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
    },
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored));
  return stored;
}

export function hasStoredConsent(): boolean {
  return readStoredConsent() !== null;
}

export function getInitialBannerPreferences(): ConsentPreferences {
  return readStoredConsent()?.preferences ?? DEFAULT_CONSENT_PREFERENCES;
}
