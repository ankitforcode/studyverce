import { redirect } from "next/navigation";
import { getFriendsPageData } from "@/app/friends/actions";
import { FriendsDirectory } from "@/components/friends/friends-directory";
import { loginPath } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";
import { createSiteMetadata } from "@/lib/site-metadata";

export const dynamic = "force-dynamic";

export const metadata = createSiteMetadata({
  title: "Friends",
  description: "Your StudyVerce friends and pending friend requests.",
});

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(loginPath("/friends"));
  }

  const { friends, pending } = await getFriendsPageData();

  return <FriendsDirectory initialFriends={friends} initialPending={pending} />;
}
