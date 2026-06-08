import type { ConsentPreferences } from "@/lib/consent/types";
import { CONSENT_STORAGE_KEY } from "@/lib/consent/storage";

export type GtagConsentState = "granted" | "denied";

export function preferencesToGtagConsent(preferences: ConsentPreferences) {
  return {
    analytics_storage: (preferences.analytics ? "granted" : "denied") as GtagConsentState,
    ad_storage: (preferences.marketing ? "granted" : "denied") as GtagConsentState,
    ad_user_data: (preferences.marketing ? "granted" : "denied") as GtagConsentState,
    ad_personalization: (preferences.marketing ? "granted" : "denied") as GtagConsentState,
  };
}

export function applyGtagConsent(preferences: ConsentPreferences) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("consent", "update", preferencesToGtagConsent(preferences));
}

/** Runs before gtag.js — Consent Mode v2 defaults + restore saved choice from localStorage. */
export function buildConsentBootstrapScript(): string {
  return `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
      wait_for_update: 500
    });
    try {
      var raw = localStorage.getItem('${CONSENT_STORAGE_KEY}');
      if (raw) {
        var parsed = JSON.parse(raw);
        var p = parsed && parsed.preferences;
        if (p) {
          gtag('consent', 'update', {
            analytics_storage: p.analytics ? 'granted' : 'denied',
            ad_storage: p.marketing ? 'granted' : 'denied',
            ad_user_data: p.marketing ? 'granted' : 'denied',
            ad_personalization: p.marketing ? 'granted' : 'denied'
          });
        }
      }
    } catch (e) {}
  `;
}
