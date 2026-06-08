import { Suspense } from "react";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { safeRedirectPath } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";
import { createSiteMetadata, NOINDEX_ROBOTS } from "@/lib/site-metadata";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/onboarding");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) {
    const params = await searchParams;
    redirect(safeRedirectPath(params.redirect) ?? "/dashboard");
  }

  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  );
}
