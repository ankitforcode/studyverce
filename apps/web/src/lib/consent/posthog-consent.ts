import posthog from "posthog-js";
import type { ConsentPreferences } from "@/lib/consent/types";
import { POSTHOG_INIT_OPTIONS } from "@/lib/consent/posthog-config";

let posthogInitialized = false;

export function syncPostHogConsent(preferences: ConsentPreferences) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || typeof window === "undefined") return;

  if (!posthogInitialized) {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      ...POSTHOG_INIT_OPTIONS,
    });
    posthogInitialized = true;
  }

  if (preferences.analytics) {
    posthog.opt_in_capturing();
    posthog.startSessionRecording();
  } else {
    posthog.stopSessionRecording();
    posthog.opt_out_capturing();
  }
}

export function isPostHogAnalyticsActive(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) &&
    typeof window !== "undefined" &&
    !posthog.has_opted_out_capturing()
  );
}

export function captureAnalyticsEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  if (!isPostHogAnalyticsActive()) {
    return;
  }

  posthog.capture(event, properties);
}

export function registerPostHogRouteContext(path: string) {
  if (!isPostHogAnalyticsActive()) return;

  const section = path.split("/").filter(Boolean)[0] ?? "home";

  posthog.register({
    app_route: path,
    app_section: section,
  });
}
