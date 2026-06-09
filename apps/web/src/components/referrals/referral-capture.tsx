"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  REFERRAL_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_COOKIE_NAME,
  readReferralCodeFromSearchParams,
} from "@/lib/referrals/capture";

function persistReferralCookie(code: string) {
  document.cookie = `${REFERRAL_COOKIE_NAME}=${encodeURIComponent(code)}; path=/; max-age=${REFERRAL_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function getReferralCodeFromDocumentCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${REFERRAL_COOKIE_NAME}=`));
  if (!match) return null;
  const value = decodeURIComponent(match.split("=").slice(1).join("="));
  return value.trim() || null;
}

export function ReferralCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = readReferralCodeFromSearchParams(searchParams);
    if (code) {
      persistReferralCookie(code);
    }
  }, [searchParams]);

  return null;
}
