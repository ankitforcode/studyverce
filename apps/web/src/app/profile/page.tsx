import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSiteMetadata, NOINDEX_ROBOTS } from "@/lib/site-metadata";

export const dynamic = "force-dynamic";

export const metadata = createSiteMetadata({
  path: "/profile",
  title: "Your profile",
  robots: NOINDEX_ROBOTS,
});

/** Resolve the signed-in user's canonical public profile URL (avoids stale usernames in nav links). */
export default async function ProfileIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/profile");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.username) {
    redirect("/onboarding?redirect=/profile");
  }

  if (!profile.onboarding_completed) {
    redirect("/onboarding?redirect=/profile");
  }

  redirect(`/profile/${profile.username}`);
}
