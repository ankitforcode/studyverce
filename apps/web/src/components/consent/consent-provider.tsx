"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ACCEPT_ALL_CONSENT,
  REJECT_OPTIONAL_CONSENT,
  type ConsentPreferences,
} from "@/lib/consent/types";
import { applyGtagConsent } from "@/lib/consent/gtag";
import { syncPostHogConsent } from "@/lib/consent/posthog-consent";
import {
  getInitialBannerPreferences,
  hasStoredConsent,
  readStoredConsent,
  writeStoredConsent,
} from "@/lib/consent/storage";
import { CookieConsentBanner } from "@/components/consent/cookie-consent-banner";

type ConsentContextValue = {
  preferences: ConsentPreferences | null;
  bannerOpen: boolean;
  savePreferences: (preferences: ConsentPreferences) => void;
  acceptAll: () => void;
  rejectOptional: () => void;
  openBanner: () => void;
  closeBanner: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<ConsentPreferences | null>(null);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [draftPreferences, setDraftPreferences] = useState<ConsentPreferences>(
    getInitialBannerPreferences
  );
  const [ready, setReady] = useState(false);

  const applyPreferences = useCallback((next: ConsentPreferences) => {
    writeStoredConsent(next);
    applyGtagConsent(next);
    syncPostHogConsent(next);
    setPreferences(next);
    setDraftPreferences(next);
    setBannerOpen(false);
  }, []);

  useEffect(() => {
    const stored = readStoredConsent();
    if (stored) {
      setPreferences(stored.preferences);
      setDraftPreferences(stored.preferences);
      applyGtagConsent(stored.preferences);
      syncPostHogConsent(stored.preferences);
      setBannerOpen(false);
    } else {
      setBannerOpen(true);
    }
    setReady(true);
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      preferences,
      bannerOpen,
      savePreferences: applyPreferences,
      acceptAll: () => applyPreferences(ACCEPT_ALL_CONSENT),
      rejectOptional: () => applyPreferences(REJECT_OPTIONAL_CONSENT),
      openBanner: () => {
        setDraftPreferences(preferences ?? getInitialBannerPreferences());
        setBannerOpen(true);
      },
      closeBanner: () => {
        if (hasStoredConsent()) {
          setBannerOpen(false);
        }
      },
    }),
    [applyPreferences, bannerOpen, preferences]
  );

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {ready && bannerOpen && (
        <CookieConsentBanner
          preferences={draftPreferences}
          onChange={setDraftPreferences}
          onAcceptAll={value.acceptAll}
          onRejectOptional={value.rejectOptional}
          onSave={() => value.savePreferences(draftPreferences)}
          onClose={value.closeBanner}
        />
      )}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error("useConsent must be used within ConsentProvider");
  }
  return context;
}

export function useConsentOptional() {
  return useContext(ConsentContext);
}
