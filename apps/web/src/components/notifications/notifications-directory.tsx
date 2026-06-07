"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Info,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useNotifications } from "@/components/notifications/notification-provider";
import type { AppNotification, NotificationKind } from "@/lib/notifications/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type FilterTab = "all" | "unread" | "dismissed";

const kindIcons: Record<NotificationKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const kindAccent: Record<NotificationKind, string> = {
  success: "text-primary",
  error: "text-destructive",
  warning: "text-amber-400",
  info: "text-muted-foreground",
};

function NotificationRow({
  notification,
  onDismiss,
  onRemove,
  onRemind,
  onRead,
}: {
  notification: AppNotification;
  onDismiss: (id: string) => void;
  onRemove: (id: string) => void;
  onRemind: (id: string) => void;
  onRead: (id: string) => void;
}) {
  const Icon = kindIcons[notification.kind];

  return (
    <li
      className={cn(
        "rounded-xl border border-border bg-card px-4 py-3 transition-colors",
        !notification.read && !notification.dismissed && "border-primary/25 bg-primary/5",
        notification.dismissed && "opacity-70"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
          <Icon className={cn("h-4 w-4", kindAccent[notification.kind])} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="text-sm font-semibold text-foreground">{notification.title}</p>
            {!notification.read && !notification.dismissed && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                New
              </span>
            )}
            {notification.remindOnLogin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                <Clock className="h-3 w-3" />
                Next login
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
          <p className="mt-1.5 text-[11px] text-muted-foreground/80">
            {format(new Date(notification.createdAt), "MMM d, yyyy · h:mm a")}
          </p>
          {notification.href && (
            <Link
              href={notification.href}
              onClick={() => onRead(notification.id)}
              className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
            >
              View details
            </Link>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        {!notification.dismissed ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => onDismiss(notification.id)}
          >
            <X className="h-3.5 w-3.5" />
            Dismiss
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => onRemind(notification.id)}
        >
          <Clock className="h-3.5 w-3.5" />
          Remind at next login
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onRemove(notification.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </Button>
      </div>
    </li>
  );
}

export function NotificationsDirectory() {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    dismissNotification,
    removeNotification,
    remindOnLogin,
    clearDismissed,
  } = useNotifications();
  const [tab, setTab] = useState<FilterTab>("all");

  const filtered = useMemo(() => {
    if (tab === "unread") {
      return notifications.filter((entry) => !entry.read && !entry.dismissed);
    }
    if (tab === "dismissed") {
      return notifications.filter((entry) => entry.dismissed);
    }
    return notifications.filter((entry) => !entry.dismissed);
  }, [notifications, tab]);

  const dismissedCount = notifications.filter((entry) => entry.dismissed).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Notifications</h1>
                <p className="text-sm text-muted-foreground">
                  Toasts and activity from rooms, friends, and settings
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button type="button" size="sm" variant="outline" onClick={markAllRead}>
                Mark all read
              </Button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                ["all", "Active"],
                ["unread", `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`],
                ["dismissed", `Dismissed${dismissedCount > 0 ? ` (${dismissedCount})` : ""}`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  tab === value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No notifications here</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {tab === "unread"
                ? "You're all caught up."
                : tab === "dismissed"
                  ? "Dismissed notifications will appear here until you remove them."
                  : "Actions like friend requests, room access, and favorites will show up here."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onDismiss={dismissNotification}
                onRemove={removeNotification}
                onRemind={remindOnLogin}
                onRead={markRead}
              />
            ))}
          </ul>
        )}

        {tab === "dismissed" && dismissedCount > 0 && (
          <div className="mt-6 flex justify-end">
            <Button type="button" size="sm" variant="ghost" onClick={clearDismissed}>
              Clear all dismissed
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
