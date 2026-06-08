export type ConsentCategory = "necessary" | "analytics" | "marketing";

export type ConsentPreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export type StoredConsent = {
  version: 1;
  preferences: ConsentPreferences;
  updatedAt: string;
};

export const DEFAULT_CONSENT_PREFERENCES: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export const ACCEPT_ALL_CONSENT: ConsentPreferences = {
  necessary: true,
  analytics: true,
  marketing: true,
};

export const REJECT_OPTIONAL_CONSENT: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};
