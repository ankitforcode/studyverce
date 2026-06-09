import posthog from "posthog-js";
import type { User } from "@supabase/supabase-js";
import type { ConsentPreferences } from "@/lib/consent/types";
import { POSTHOG_INIT_OPTIONS } from "@/lib/consent/posthog-config";
import { createClient } from "@/lib/supabase/client";

let posthogInitialized = false;

function ensurePostHogInitialized() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || typeof window === "undefined" || posthogInitialized) return false;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    ...POSTHOG_INIT_OPTIONS,
  });
  posthogInitialized = true;
  return true;
}

async function fetchPostHogPersonProperties(
  user: User
): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, plan_tier")
    .eq("id", user.id)
    .maybeSingle();

  const properties: Record<string, string> = {};
  if (user.email) properties.email = user.email;
  if (profile?.username) properties.username = profile.username;
  if (profile?.display_name) properties.name = profile.display_name;
  if (profile?.plan_tier) properties.plan_tier = profile.plan_tier;
  return properties;
}

export function identifyPostHogUser(
  userId: string,
  properties?: Record<string, string>
) {
  if (!posthogInitialized || posthog.has_opted_out_capturing()) return;
  posthog.identify(userId, properties);
}

export function resetPostHogUser() {
  if (!posthogInitialized) return;
  posthog.reset();
}

/** Links a signed-in Supabase user to PostHog. No-op for anonymous visitors. */
export async function syncPostHogUserFromSession(): Promise<boolean> {
  if (!posthogInitialized || posthog.has_opted_out_capturing()) return false;

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return false;
  }

  const properties = await fetchPostHogPersonProperties(session.user);
  identifyPostHogUser(session.user.id, properties);
  return true;
}

export function startPostHogSessionRecording() {
  if (!posthogInitialized || posthog.has_opted_out_capturing()) return;
  posthog.startSessionRecording();
}

/** Identify signed-in users when present; always start replay for consented visitors. */
export async function syncPostHogIdentityAndRecording() {
  if (!posthogInitialized || posthog.has_opted_out_capturing()) return;

  await syncPostHogUserFromSession();
  startPostHogSessionRecording();
}

/** Clear identity after sign-out and continue anonymous session replay. */
export function handlePostHogSignedOut() {
  if (!posthogInitialized || posthog.has_opted_out_capturing()) return;

  resetPostHogUser();
  startPostHogSessionRecording();
}

export function syncPostHogConsent(preferences: ConsentPreferences) {
  if (!ensurePostHogInitialized()) return;

  if (preferences.analytics) {
    posthog.opt_in_capturing();
    void syncPostHogIdentityAndRecording();
  } else {
    posthog.stopSessionRecording();
    posthog.opt_out_capturing();
  }
}

export function isPostHogAnalyticsActive(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) &&
    typeof window !== "undefined" &&
    posthogInitialized &&
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
