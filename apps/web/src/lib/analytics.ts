"use client";

import posthog from "posthog-js";
import { useEffect, type ReactNode } from "react";

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (key) {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
        person_profiles: "identified_only",
        capture_pageview: true,
      });
    }
  }, []);

  return children;
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.capture(event, properties);
  }
}
