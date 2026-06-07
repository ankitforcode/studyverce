import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationsDirectory } from "@/components/notifications/notifications-directory";

export const dynamic = "force-dynamic";

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
