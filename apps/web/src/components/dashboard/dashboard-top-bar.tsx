"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Music2 } from "lucide-react";
import { format } from "date-fns";

export function DashboardTopBar() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/30 px-6">
      <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <span className="text-muted-foreground">0 friends online</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
        <time className="text-sm text-muted-foreground tabular-nums">
          {format(now, "MMM d h:mm a")}
        </time>
        <Link
          href="/rooms"
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
          aria-label="Room music"
        >
          <Music2 className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
