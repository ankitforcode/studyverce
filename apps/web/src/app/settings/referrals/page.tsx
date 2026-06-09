import { redirect } from "next/navigation";
import { getReferralsPageData } from "@/app/settings/referrals/actions";
import { ReferralsPanel } from "@/components/referrals/referral-progress-card";
import { createClient } from "@/lib/supabase/server";
import { createSiteMetadata, NOINDEX_ROBOTS } from "@/lib/site-metadata";

export const metadata = createSiteMetadata({
  path: "/settings/referrals",
  title: "Referrals & rewards",
  robots: NOINDEX_ROBOTS,
});

export default async function ReferralsSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirect=/settings/referrals");

  const data = await getReferralsPageData();
  if (!data) redirect("/auth/login?redirect=/settings/referrals");

  return <ReferralsPanel data={data} />;
}
