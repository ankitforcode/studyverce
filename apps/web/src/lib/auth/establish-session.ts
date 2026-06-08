import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Finish an email auth redirect (invite, magic link, recovery) in the browser.
 * Handles PKCE `code`, `token_hash` + `type`, and implicit hash tokens.
 */
export async function establishSessionFromUrl(
  searchParams: URLSearchParams
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return { error: error?.message ?? null };
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    return { error: error?.message ?? null };
  }

  // Implicit flow puts tokens in the URL hash; the browser client reads them on init.
  const { error } = await supabase.auth.getSession();
  return { error: error?.message ?? null };
}
