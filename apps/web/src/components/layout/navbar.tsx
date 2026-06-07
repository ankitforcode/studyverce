import Link from "next/link";
import { BookOpen, LayoutDashboard, Shield, Users, Trophy } from "lucide-react";
import { getPendingFriendRequestCount } from "@/app/friends/actions";
import { createClient } from "@/lib/supabase/server";
import { NavbarProfileMenu } from "@/components/layout/navbar-profile-menu";
import { NavLink } from "@/components/layout/nav-link";
import { Avatar } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinkClass =
  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  let pendingFriendRequests = 0;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url, is_admin")
      .eq("id", user.id)
      .single();
    profile = data;
    pendingFriendRequests = await getPendingFriendRequestCount();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-16 w-full items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 font-bold text-lg leading-none"
        >
          <BookOpen className="h-6 w-6 shrink-0 text-primary" />
          <span>StudyVerce</span>
        </Link>

        <nav
          className={cn("hidden flex-1 items-center justify-center gap-1 md:flex")}
          aria-label="Main"
        >
          <NavLink href="/rooms" match="prefix" className={navLinkClass}>
            <Users className="h-4 w-4 shrink-0" />
            Rooms
          </NavLink>
          {user && (
            <NavLink href="/dashboard" match="exact" className={navLinkClass}>
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              Dashboard
            </NavLink>
          )}
          <NavLink href="/leaderboard" match="exact" className={navLinkClass}>
            <Trophy className="h-4 w-4 shrink-0" />
            Leaderboard
          </NavLink>
          {profile?.is_admin && (
            <NavLink href="/admin" match="prefix" className={navLinkClass}>
              <Shield className="h-4 w-4 shrink-0" />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-4">
          {user ? (
            <>
              <Link
                href={`/profile/${profile?.username ?? "me"}`}
                className="rounded-lg p-1 sm:hidden"
                aria-label="Your profile"
              >
                <Avatar
                  src={profile?.avatar_url ?? null}
                  fallback={profile?.display_name ?? "Profile"}
                  size="sm"
                />
              </Link>
              <NavbarProfileMenu
                username={profile?.username ?? "me"}
                displayName={profile?.display_name ?? "Profile"}
                avatarUrl={profile?.avatar_url ?? null}
                isAdmin={profile?.is_admin ?? false}
                pendingFriendRequests={pendingFriendRequests}
              />
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="h-9">
                  Log in
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm" className="h-9">
                  Sign up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
