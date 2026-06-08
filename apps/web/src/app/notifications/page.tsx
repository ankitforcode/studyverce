import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationsDirectory } from "@/components/notifications/notifications-directory";
import { createSiteMetadata, NOINDEX_ROBOTS } from "@/lib/site-metadata";

export const dynamic = "force-dynamic";

export const metadata = createSiteMetadata({
  path: "/notifications",
  title: "Notifications",
  robots: NOINDEX_ROBOTS,
});

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/notifications");
  }

  return <NotificationsDirectory />;
}
