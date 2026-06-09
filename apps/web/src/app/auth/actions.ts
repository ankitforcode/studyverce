"use server";

import { redirect } from "next/navigation";
import type { PlanTier } from "@studyverce/shared";
import { createClient } from "@/lib/supabase/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { createServiceClient } from "@/lib/supabase/service";
import { findAuthUserByEmail } from "@/lib/auth/admin-users";
import { formatMagicLinkLoginError } from "@/lib/auth/errors";
import { authCallbackUrl, safeRedirectPath } from "@/lib/auth/paths";
import {
  FORCE_PASSWORD_CHANGE_METADATA_KEY,
  PASSWORD_SET_METADATA_KEY,
} from "@/lib/auth/room-invite";
import { canUseMagicLinkLogin } from "@/lib/premium";

const MAGIC_LINK_SENT_MESSAGE =
  "If an account exists for this email, we sent a sign-in link. Check your inbox.";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function acceptInviteSetPassword(
  password: string
): Promise<{ error: string | null }> {
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) {
    return { error: passwordError.message };
  }

  const service = createServiceClient();
  const { error: metadataError } = await service.auth.admin.updateUserById(user.id, {
    app_metadata: {
      [PASSWORD_SET_METADATA_KEY]: true,
    },
    user_metadata: {
      [FORCE_PASSWORD_CHANGE_METADATA_KEY]: false,
    },
  });

  if (metadataError) {
    return { error: metadataError.message };
  }

  return { error: null };
}

export async function sendMagicLinkLogin(
  email: string,
  redirect?: string
): Promise<{ error: string | null; message?: string }> {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { error: "Enter a valid email address." };
  }

  const safeRedirect = safeRedirectPath(redirect) ?? "/dashboard";

  try {
    const user = await findAuthUserByEmail(normalized);
    if (!user) {
      return { error: null, message: MAGIC_LINK_SENT_MESSAGE };
    }

    const service = createServiceClient();
    const { data: profile, error: profileError } = await service
      .from("profiles")
      .select("plan_tier")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || !canUseMagicLinkLogin(profile.plan_tier as PlanTier)) {
      return { error: null, message: MAGIC_LINK_SENT_MESSAGE };
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

    return { error: null, message: MAGIC_LINK_SENT_MESSAGE };
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Could not send sign-in link.";
    return { error: message };
  }
}
