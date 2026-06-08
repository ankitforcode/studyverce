"use client";

import { captureAnalyticsEvent } from "@/lib/consent/posthog-consent";

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  captureAnalyticsEvent(event, properties);
}
