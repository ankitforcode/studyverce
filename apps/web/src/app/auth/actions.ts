"use server";

import { redirect } from "next/navigation";
import type { PlanTier } from "@studyverce/shared";
import { createClient } from "@/lib/supabase/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { createServiceClient } from "@/lib/supabase/service";
import { findAuthUserByEmail } from "@/lib/auth/admin-users";
import {
  formatMagicLinkLoginError,
  MAGIC_LINK_PREMIUM_REQUIRED,
} from "@/lib/auth/errors";
import { authCallbackUrl, safeRedirectPath } from "@/lib/auth/paths";
import { canUseMagicLinkLogin } from "@/lib/premium";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function sendMagicLinkLogin(
  email: string,
  redirect?: string
): Promise<{ error: string | null }> {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { error: "Enter a valid email address." };
  }

  const safeRedirect = safeRedirectPath(redirect) ?? "/dashboard";

  try {
    const user = await findAuthUserByEmail(normalized);
    if (!user) {
      return { error: formatMagicLinkLoginError("user not found") };
    }

    const service = createServiceClient();
    const { data: profile, error: profileError } = await service
      .from("profiles")
      .select("plan_tier")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return {
        error: "Could not verify your account. Try signing in with your password.",
      };
    }

    if (!canUseMagicLinkLogin(profile.plan_tier as PlanTier)) {
      return { error: MAGIC_LINK_PREMIUM_REQUIRED };
    }

    const anon = createAnonClient();
    const { error } = await anon.auth.signInWithOtp({
      email: normalized,
      options: {
        emailRedirectTo: authCallbackUrl(safeRedirect),
        shouldCreateUser: false,
        data: { post_auth_redirect: safeRedirect },
      },
    });

    if (error) {
      return { error: formatMagicLinkLoginError(error.message) };
    }

    return { error: null };
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Could not send sign-in link.";
    return { error: message };
  }
}
