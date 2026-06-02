import Link from "next/link";
import { BookOpen, LayoutDashboard, Users, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
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
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="relative z-10 flex shrink-0 items-center gap-2.5 font-bold text-lg leading-none"
        >
          <BookOpen className="h-6 w-6 shrink-0 text-primary" />
          <span>StudyVerse</span>
        </Link>

        <nav
          className={cn(
            "absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2",
            "md:flex items-center gap-1"
          )}
          aria-label="Main"
        >
          <Link href="/rooms" className={navLinkClass}>
            <Users className="h-4 w-4 shrink-0" />
            Rooms
          </Link>
          {user && (
            <Link href="/dashboard" className={navLinkClass}>
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              Dashboard
            </Link>
          )}
          <Link href="/leaderboard" className={navLinkClass}>
            <Trophy className="h-4 w-4 shrink-0" />
            Leaderboard
          </Link>
        </nav>

        <div className="relative z-10 ml-auto flex shrink-0 items-center gap-4">
          {user ? (
            <>
              <Link
                href={`/profile/${profile?.username ?? "me"}`}
                className="hidden max-w-[140px] truncate text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
              >
                {profile?.display_name ?? "Profile"}
              </Link>
              <form
                action={async () => {
                  "use server";
                  const { signOutAction } = await import("@/app/auth/actions");
                  await signOutAction();
                }}
              >
                <Button variant="outline" size="sm" type="submit" className="h-9">
                  Sign out
                </Button>
              </form>
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
