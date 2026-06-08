"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Shield, Trophy, Users } from "lucide-react";
import { getNavbarAuthState, type NavbarAuthState } from "@/app/auth/navbar-actions";
import { NavbarNotificationsButton } from "@/components/layout/navbar-notifications-button";
import { NavbarProfileMenu } from "@/components/layout/navbar-profile-menu";
import { NavLink } from "@/components/layout/nav-link";
import { Avatar } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navLinkClass =
  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground";

export function NavbarInteractive() {
  const [authState, setAuthState] = useState<NavbarAuthState | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAuthState() {
      const next = await getNavbarAuthState();
      if (!cancelled) {
        setAuthState(next);
      }
    }

    void loadAuthState();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadAuthState();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const profile = authState?.profile;
  const isLoading = authState === null;

  return (
    <>
      <nav
        className={cn("hidden flex-1 items-center justify-center gap-1 md:flex")}
        aria-label="Main"
      >
        <NavLink href="/rooms" match="prefix" className={navLinkClass}>
          <Users className="h-4 w-4 shrink-0" />
          Rooms
        </NavLink>
        {profile && (
          <NavLink href="/dashboard" match="exact" className={navLinkClass}>
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Dashboard
          </NavLink>
        )}
        <NavLink href="/leaderboard" match="exact" className={navLinkClass}>
          <Trophy className="h-4 w-4 shrink-0" />
          Leaderboard
        </NavLink>
        {profile?.isAdmin && (
          <NavLink href="/admin" match="prefix" className={navLinkClass}>
            <Shield className="h-4 w-4 shrink-0" />
            Admin
          </NavLink>
        )}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-4">
        {isLoading ? (
          <div
            className="h-9 w-[168px] animate-pulse rounded-lg bg-muted/50"
            aria-hidden
          />
        ) : profile ? (
          <>
            <Link
              href={`/profile/${profile.username}`}
              className="rounded-lg p-1 sm:hidden"
              aria-label="Your profile"
            >
              <Avatar src={profile.avatarUrl} fallback={profile.displayName} size="sm" />
            </Link>
            <NavbarNotificationsButton />
            <NavbarProfileMenu
              username={profile.username}
              displayName={profile.displayName}
              avatarUrl={profile.avatarUrl}
              isAdmin={profile.isAdmin}
              pendingFriendRequests={authState.pendingFriendRequests}
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
    </>
  );
}
