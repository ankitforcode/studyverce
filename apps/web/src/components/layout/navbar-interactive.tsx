"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Menu,
  Shield,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
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

const mobileNavLinkClass =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground";

const homeAnchors = [
  { href: "/#features", label: "Features" },
  { href: "/#about", label: "About" },
] as const;

export function NavbarInteractive() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [authState, setAuthState] = useState<NavbarAuthState | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-navbar]");
    if (!header) return;

    function onScroll() {
      const scrolled = !isHome || window.scrollY > 12;
      header?.classList.toggle("navbar-scrolled", scrolled);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const profile = authState?.profile;
  const isLoading = authState === null;

  const mainLinks = (
    <>
      <NavLink href="/rooms" match="prefix" className={navLinkClass}>
        <Users className="h-4 w-4 shrink-0" />
        Rooms
      </NavLink>
      {isHome &&
        homeAnchors.map((link) => (
          <Link key={link.href} href={link.href} className={navLinkClass}>
            {link.label}
          </Link>
        ))}
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
      <NavLink href="/plans" match="exact" className={navLinkClass}>
        <Sparkles className="h-4 w-4 shrink-0" />
        Plans
      </NavLink>
      {profile?.isAdmin && (
        <NavLink href="/admin" match="prefix" className={navLinkClass}>
          <Shield className="h-4 w-4 shrink-0" />
          Admin
        </NavLink>
      )}
    </>
  );

  return (
    <>
      <nav
        className={cn("hidden flex-1 items-center justify-center gap-1 md:flex")}
        aria-label="Main"
      >
        {mainLinks}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        {isLoading ? (
          <div
            className="hidden h-9 w-[168px] animate-pulse rounded-lg bg-muted/50 sm:block"
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
          <div className="hidden items-center gap-3 sm:flex">
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
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 md:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileOpen && (
        <div
          id="mobile-nav"
          className="absolute inset-x-0 top-16 z-40 border-b border-border/60 bg-background/95 px-4 py-4 shadow-lg backdrop-blur-md md:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            <NavLink
              href="/rooms"
              match="prefix"
              className={mobileNavLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              <Users className="h-4 w-4 shrink-0" />
              Rooms
            </NavLink>
            {isHome &&
              homeAnchors.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={mobileNavLinkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            {profile && (
              <NavLink
                href="/dashboard"
                match="exact"
                className={mobileNavLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                Dashboard
              </NavLink>
            )}
            <NavLink
              href="/leaderboard"
              match="exact"
              className={mobileNavLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              <Trophy className="h-4 w-4 shrink-0" />
              Leaderboard
            </NavLink>
            <NavLink
              href="/plans"
              match="exact"
              className={mobileNavLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              Plans
            </NavLink>
            {profile?.isAdmin && (
              <NavLink
                href="/admin"
                match="prefix"
                className={mobileNavLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                <Shield className="h-4 w-4 shrink-0" />
                Admin
              </NavLink>
            )}
          </nav>

          {!profile && !isLoading && (
            <div className="mt-4 flex flex-col gap-2 border-t border-border/50 pt-4">
              <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full">
                  Log in
                </Button>
              </Link>
              <Link href="/auth/signup" onClick={() => setMobileOpen(false)}>
                <Button className="w-full">Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
