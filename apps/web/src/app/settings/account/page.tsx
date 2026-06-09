import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountSettingsForm } from "@/components/settings/account-settings-form";
import { createSiteMetadata, NOINDEX_ROBOTS } from "@/lib/site-metadata";

export const metadata = createSiteMetadata({
  path: "/settings/account",
  title: "Account Settings",
  description: "Update your StudyVerce email, password, and security settings.",
  robots: NOINDEX_ROBOTS,
});

export default async function SettingsAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/settings/profile");

  return <AccountSettingsForm currentEmail={user.email} />;
}
