"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Home,
  LogOut,
  Settings,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { Avatar } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { appNavSections } from "@/lib/app-nav";

interface NavbarProfileMenuProps {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin?: boolean;
  pendingFriendRequests?: number;
}

const menuLinkClass =
  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

export function NavbarProfileMenu({
  username,
  displayName,
  avatarUrl,
  isAdmin = false,
  pendingFriendRequests = 0,
}: NavbarProfileMenuProps) {
  const pathname = usePathname();
  const profileHref = `/profile/${username}`;

  return (
    <div className="group relative hidden sm:block">
      <button
        type="button"
        className="flex max-w-[200px] items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-haspopup="menu"
        aria-expanded={false}
      >
        <Avatar src={avatarUrl} fallback={displayName} size="sm" />
        <span className="truncate">{displayName}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60 transition-transform group-hover:rotate-180" />
      </button>

      <div
        className={cn(
          "pointer-events-none absolute right-0 top-full z-50 w-60 pt-2",
          "opacity-0 transition-opacity duration-150",
          "group-hover:pointer-events-auto group-hover:opacity-100",
          "group-focus-within:pointer-events-auto group-focus-within:opacity-100"
        )}
        role="menu"
      >
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="border-b border-border p-3">
            <Link
              href={profileHref}
              className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-muted"
              role="menuitem"
            >
              <Avatar src={avatarUrl} fallback={displayName} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {displayName}
                </p>
                <p className="truncate text-xs text-muted-foreground">@{username}</p>
              </div>
            </Link>
          </div>

          <div className="space-y-1 p-2">
            <Link
              href="/dashboard"
              className={cn(
                menuLinkClass,
                pathname === "/dashboard" && "bg-primary/10 text-primary"
              )}
              role="menuitem"
            >
              <Home className="h-4 w-4 shrink-0" />
              Dashboard
            </Link>
            <Link href="/rooms" className={menuLinkClass} role="menuitem">
              <Users className="h-4 w-4 shrink-0" />
              Rooms
            </Link>
            <Link href="/leaderboard" className={menuLinkClass} role="menuitem">
              <Trophy className="h-4 w-4 shrink-0" />
              Leaderboard
            </Link>
          </div>

          {appNavSections.map((section) => (
            <div key={section.label} className="border-t border-border px-2 py-2">
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={`${section.label}-${item.label}`}>
                    <Link href={item.href} className={menuLinkClass} role="menuitem">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1">{item.label}</span>
                      {item.href === "/friends" && pendingFriendRequests > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                          {pendingFriendRequests > 9 ? "9+" : pendingFriendRequests}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="space-y-0.5 border-t border-border p-2">
            {isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  menuLinkClass,
                  pathname.startsWith("/admin") && "bg-primary/10 text-primary"
                )}
                role="menuitem"
              >
                <Shield className="h-4 w-4 shrink-0" />
                Manage users
              </Link>
            )}
            <Link
              href="/settings/profile"
              className={menuLinkClass}
              role="menuitem"
            >
              <Settings className="h-4 w-4 shrink-0" />
              Settings
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className={cn(menuLinkClass, "w-full text-left text-destructive hover:bg-destructive/10 hover:text-destructive")}
                role="menuitem"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
