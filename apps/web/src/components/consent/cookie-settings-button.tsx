"use client";

import type { ReactNode } from "react";
import { useConsentOptional } from "@/components/consent/consent-provider";

export function CookieSettingsButton({
  className,
  children = "Cookie settings",
}: {
  className?: string;
  children?: ReactNode;
}) {
  const consent = useConsentOptional();

  if (!consent) return null;

  return (
    <button type="button" onClick={consent.openBanner} className={className}>
      {children}
    </button>
  );
}
