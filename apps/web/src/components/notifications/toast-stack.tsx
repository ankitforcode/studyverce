"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from "lucide-react";
import type { ActiveToast, NotificationKind } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

const kindStyles: Record<
  NotificationKind,
  { icon: typeof CheckCircle2; container: string; iconClass: string }
> = {
  success: {
    icon: CheckCircle2,
    container: "border-primary/35 bg-primary/10",
    iconClass: "text-primary",
  },
  error: {
    icon: XCircle,
    container: "border-destructive/35 bg-destructive/10",
    iconClass: "text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    container: "border-amber-500/35 bg-amber-500/10",
    iconClass: "text-amber-400",
  },
  info: {
    icon: Info,
    container: "border-border/60 bg-card/90",
    iconClass: "text-muted-foreground",
  },
};

interface ToastStackProps {
  toasts: ActiveToast[];
  onDismiss: (id: string) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[min(100vw-2rem,22rem)] flex-col gap-2 sm:bottom-6 sm:right-6"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const style = kindStyles[toast.kind];
        const Icon = style.icon;

        const body = (
          <>
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", style.iconClass)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{toast.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {toast.message}
              </p>
            </div>
          </>
        );

        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-lg backdrop-blur-md",
              style.container,
              toast.exiting ? "toast-exit" : "toast-enter"
            )}
          >
            {toast.href ? (
              <Link
                href={toast.href}
                className="flex min-w-0 flex-1 items-start gap-2.5 transition-opacity hover:opacity-90"
              >
                {body}
              </Link>
            ) : (
              <div className="flex min-w-0 flex-1 items-start gap-2.5">{body}</div>
            )}
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              aria-label="Dismiss toast"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function NotificationsEmptyIcon() {
  return <Bell className="h-5 w-5 text-muted-foreground" />;
}
