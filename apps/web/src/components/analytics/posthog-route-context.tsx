"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useConsentOptional } from "@/components/consent/consent-provider";
import { registerPostHogRouteContext } from "@/lib/consent/posthog-consent";

function PostHogRouteContextInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const consent = useConsentOptional();

  useEffect(() => {
    if (!consent?.preferences?.analytics) return;

    const query = searchParams.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    registerPostHogRouteContext(path);
  }, [consent?.preferences?.analytics, pathname, searchParams]);

  return null;
}

/** Registers route context on PostHog events (including `$web_vitals`) after analytics consent. */
export function PostHogRouteContext() {
  return (
    <Suspense fallback={null}>
      <PostHogRouteContextInner />
    </Suspense>
  );
}
