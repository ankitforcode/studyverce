import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolvePostAuthDestination, safeRedirectPath } from "@/lib/auth/paths";
import { userMustSetPassword } from "@/lib/auth/room-invite";
import { rateLimitOrNull } from "@/lib/rate-limit/route-guard";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthRedirectOrigin } from "@/lib/site-metadata";
import {
  REFERRAL_COOKIE_NAME,
  normalizeReferralCode,
} from "@/lib/referrals/capture";
import { attachReferralFromCode } from "@/lib/referrals/rewards";

const POST_AUTH_REDIRECT_METADATA_KEY = "post_auth_redirect";

function readPostAuthRedirectFromMetadata(
  metadata: Record<string, unknown> | undefined
): string | null {
  const value = metadata?.[POST_AUTH_REDIRECT_METADATA_KEY];
  return typeof value === "string" ? safeRedirectPath(value) : null;
}

export async function GET(request: Request) {
  const limited = await rateLimitOrNull(request);
  if (limited) return limited;

  const redirectOrigin = resolveAuthRedirectOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type");
  const nextFromQuery = safeRedirectPath(searchParams.get("next"));

  const supabase = await createClient();
  let sessionEstablished = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    sessionEstablished = !error;
  } else if (tokenHash && otpType) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as EmailOtpType,
    });
    sessionEstablished = !error;
  }

  if (sessionEstablished) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const nextFromMetadata = readPostAuthRedirectFromMetadata(user?.user_metadata);
    let next = nextFromQuery ?? nextFromMetadata ?? "/onboarding";

    if (user && userMustSetPassword(user.user_metadata, user.app_metadata, user.invited_at)) {
      next = "/auth/accept-invite";
    }

    let onboardingCompleted = false;
    if (user) {
      const referralFromMetadata = normalizeReferralCode(
        typeof user.user_metadata?.referral_code === "string"
          ? user.user_metadata.referral_code
          : null
      );
      const cookieStore = await cookies();
      const referralFromCookie = normalizeReferralCode(
        cookieStore.get(REFERRAL_COOKIE_NAME)?.value
      );
      const referralCode = referralFromMetadata ?? referralFromCookie;
      if (referralCode) {
        await attachReferralFromCode(user.id, referralCode);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      onboardingCompleted = profile?.onboarding_completed ?? false;
    }

    const destination = resolvePostAuthDestination(next, onboardingCompleted);
    return NextResponse.redirect(`${redirectOrigin}${destination}`);
  }

  return NextResponse.redirect(`${redirectOrigin}/auth/login?error=auth`);
}
