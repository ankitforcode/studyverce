import { redirect } from "next/navigation";
import { resolvePostAuthDestination, safeRedirectPath } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";
import { rateLimitOrNull } from "@/lib/rate-limit/route-guard";

export async function GET(request: Request) {
  const limited = await rateLimitOrNull(request);
  if (limited) return limited;

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
