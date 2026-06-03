import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminSession = {
  userId: string;
  username: string;
  displayName: string;
};

export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return null;

  return {
    userId: user.id,
    username: profile.username,
    displayName: profile.display_name,
  };
}

/** Redirects to login or dashboard when caller is not an admin. */
export async function requireAdminSession(
  redirectTo = "/admin"
): Promise<AdminSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/dashboard");
  }

  return {
    userId: user.id,
    username: profile.username,
    displayName: profile.display_name,
  };
}
