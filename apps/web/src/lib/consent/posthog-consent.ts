import posthog from "posthog-js";
import type { ConsentPreferences } from "@/lib/consent/types";

let posthogInitialized = false;

export function syncPostHogConsent(preferences: ConsentPreferences) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || typeof window === "undefined") return;

  if (!posthogInitialized) {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: true,
      opt_out_capturing_by_default: true,
    });
    posthogInitialized = true;
  }

  if (preferences.analytics) {
    posthog.opt_in_capturing();
  } else {
    posthog.opt_out_capturing();
  }
}

export function captureAnalyticsEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || posthog.has_opted_out_capturing()) {
    return;
  }

  posthog.capture(event, properties);
}
