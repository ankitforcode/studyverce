"use server";

import { createClient } from "@/lib/supabase/server";

export type NavbarAuthState = {
  profile: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isAdmin: boolean;
  } | null;
  pendingFriendRequests: number;
};

export async function getNavbarAuthState(): Promise<NavbarAuthState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { profile: null, pendingFriendRequests: 0 };
  }

  const [{ data: profileRow }, { count, error: countError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, avatar_url, is_admin")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("friend_id", user.id)
      .eq("status", "pending"),
  ]);

  if (countError) {
    console.error("getNavbarAuthState friend count:", countError.message);
  }

  if (!profileRow) {
    return { profile: null, pendingFriendRequests: count ?? 0 };
  }

  return {
    profile: {
      username: profileRow.username,
      displayName: profileRow.display_name,
      avatarUrl: profileRow.avatar_url,
      isAdmin: profileRow.is_admin ?? false,
    },
    pendingFriendRequests: count ?? 0,
  };
}
