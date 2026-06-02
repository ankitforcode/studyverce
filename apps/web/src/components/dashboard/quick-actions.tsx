import Link from "next/link";
import {
  BookOpen,
  LayoutGrid,
  Users,
  MessageSquare,
  Timer,
  Bell,
  Video,
  DoorOpen,
  Settings2,
  type LucideIcon,
} from "lucide-react";

const actions: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/leaderboard", label: "Take Quiz", icon: BookOpen },
  { href: "/rooms", label: "Tasks", icon: LayoutGrid },
  { href: "/rooms", label: "Groups", icon: Users },
  { href: "/rooms", label: "Messages", icon: MessageSquare },
  { href: "/rooms", label: "Pomodoro", icon: Timer },
  { href: "/dashboard#reminders", label: "Reminders", icon: Bell },
  { href: "/rooms", label: "Stream", icon: Video },
  { href: "/rooms", label: "My Room", icon: DoorOpen },
];

export function QuickActions() {
  return (
    <section className="rounded-xl border border-border bg-card/40 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <button
          type="button"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings2 className="h-4 w-4" />
          Customize
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-5 text-center transition-colors hover:border-primary/30 hover:bg-primary/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/80">
              <action.icon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium">{action.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
