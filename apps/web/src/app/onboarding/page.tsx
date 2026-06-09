import { Suspense } from "react";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { safeRedirectPath } from "@/lib/auth/paths";
import { createSiteMetadata, NOINDEX_ROBOTS } from "@/lib/site-metadata";
import { getServerSupabase, getSessionUser } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export const metadata = createSiteMetadata({
  path: "/onboarding",
  title: "Complete your profile",
  robots: NOINDEX_ROBOTS,
});

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/login?redirect=/onboarding");
  }

  const supabase = await getServerSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, username, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) {
    const params = await searchParams;
    redirect(safeRedirectPath(params.redirect) ?? "/dashboard");
  }

  const initialUsername =
    profile?.username && !profile.username.startsWith("user_")
      ? profile.username
      : "";
  const initialDisplayName = profile?.display_name ?? "";

  return (
    <Suspense>
      <OnboardingForm
        initialUsername={initialUsername}
        initialDisplayName={initialDisplayName}
      />
    </Suspense>
  );
}
