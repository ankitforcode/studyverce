"use client";

import { useEffect } from "react";
import { useConsentOptional } from "@/components/consent/consent-provider";
import {
  handlePostHogSignedOut,
  syncPostHogIdentityAndRecording,
  syncPostHogUserFromSession,
  startPostHogSessionRecording,
} from "@/lib/consent/posthog-consent";
import { createClient } from "@/lib/supabase/client";

/** Keeps PostHog person identity aligned with Supabase auth; replay runs for all consented visitors. */
export function PostHogUserIdentity() {
  const consent = useConsentOptional();

  useEffect(() => {
    if (!consent?.preferences?.analytics) return;

    const supabase = createClient();

    void syncPostHogIdentityAndRecording();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        handlePostHogSignedOut();
        return;
      }

      if (session?.user) {
        void syncPostHogUserFromSession().then(() => startPostHogSessionRecording());
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [consent?.preferences?.analytics]);

  return null;
}
