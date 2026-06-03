import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateLimitOrNull } from "@/lib/rate-limit/route-guard";

export async function GET(request: Request) {
  const limited = await rateLimitOrNull(request);
  if (limited) return limited;

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect(`${origin}${next}`);
    }
  }

  redirect("/auth/login?error=auth");
}
