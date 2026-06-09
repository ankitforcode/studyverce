import type { PerformanceCaptureConfig } from "posthog-js";

/** Core Web Vitals sent as PostHog `$web_vitals` events when analytics consent is granted. */
export const POSTHOG_WEB_VITALS_CONFIG: PerformanceCaptureConfig = {
  web_vitals_allowed_metrics: ["CLS", "FCP", "INP", "LCP"],
  web_vitals_delayed_flush_ms: 5000,
};

/** Mask typed input and elements marked with `data-ph-mask` (chat, post-its, etc.). */
export const POSTHOG_SESSION_RECORDING_CONFIG = {
  maskAllInputs: true,
  maskTextSelector: "[data-ph-mask]",
};

export const POSTHOG_INIT_OPTIONS = {
  person_profiles: "identified_only" as const,
  capture_pageview: "history_change" as const,
  capture_pageleave: true,
  opt_out_capturing_by_default: true,
  capture_performance: POSTHOG_WEB_VITALS_CONFIG,
  disable_session_recording: true,
  session_recording: POSTHOG_SESSION_RECORDING_CONFIG,
};
