import { redirect } from "next/navigation";
import { resolvePostAuthDestination, safeRedirectPath } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";
import { rateLimitOrNull } from "@/lib/rate-limit/route-guard";

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

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextFromQuery = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const nextFromMetadata = readPostAuthRedirectFromMetadata(user?.user_metadata);
      const next = nextFromQuery ?? nextFromMetadata ?? "/onboarding";

      let onboardingCompleted = false;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .maybeSingle();
        onboardingCompleted = profile?.onboarding_completed ?? false;
      }

      const destination = resolvePostAuthDestination(next, onboardingCompleted);
      redirect(`${origin}${destination}`);
    }
  }

  redirect("/auth/login?error=auth");
}
