"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createNotificationId,
  loadNotifications,
  saveNotifications,
} from "@/lib/notifications/storage";
import type {
  ActiveToast,
  AppNotification,
  ToastInput,
} from "@/lib/notifications/types";
import { ToastStack } from "@/components/notifications/toast-stack";

const TOAST_DURATION_MS = 4_500;
const MAX_VISIBLE_TOASTS = 4;

type NotificationContextValue = {
  userId: string | null;
  ready: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  toast: (input: ToastInput) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismissNotification: (id: string) => void;
  removeNotification: (id: string) => void;
  remindOnLogin: (id: string) => void;
  clearDismissed: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

function toStoredNotification(input: ToastInput): AppNotification {
  return {
    id: createNotificationId(),
    action: input.action ?? "generic",
    kind: input.kind,
    title: input.title,
    message: input.message,
    href: input.href,
    createdAt: new Date().toISOString(),
    read: false,
    dismissed: false,
    remindOnLogin: false,
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const remindersHandled = useRef(false);
  const toastTimers = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      remindersHandled.current = false;
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    setNotifications(loadNotifications(userId));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    saveNotifications(userId, notifications);
  }, [userId, notifications]);

  const pushToast = useCallback((input: ToastInput) => {
    const id = createNotificationId();
    const toast: ActiveToast = {
      ...input,
      id,
      createdAt: Date.now(),
    };

    setToasts((prev) => {
      const next = [...prev, toast];
      return next.slice(-MAX_VISIBLE_TOASTS);
    });

    const timer = window.setTimeout(() => {
      setToasts((prev) =>
        prev.map((entry) => (entry.id === id ? { ...entry, exiting: true } : entry))
      );
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((entry) => entry.id !== id));
        toastTimers.current.delete(id);
      }, 180);
    }, TOAST_DURATION_MS);

    toastTimers.current.set(id, timer);
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      pushToast(input);
      if (input.persist === false || !userId) return;

      const stored = toStoredNotification(input);
      setNotifications((prev) => [stored, ...prev].slice(0, 100));
    },
    [pushToast, userId]
  );

  useEffect(() => {
    if (!userId || !ready || remindersHandled.current) return;

    const reminders = loadNotifications(userId).filter(
      (entry) => entry.remindOnLogin && !entry.dismissed
    );
    if (reminders.length === 0) {
      remindersHandled.current = true;
      return;
    }

    for (const entry of reminders) {
      pushToast({
        action: entry.action,
        kind: entry.kind,
        title: entry.title,
        message: entry.message,
        href: entry.href,
        persist: false,
      });
    }

    setNotifications((prev) =>
      prev.map((entry) =>
        entry.remindOnLogin
          ? { ...entry, remindOnLogin: false, read: false }
          : entry
      )
    );
    remindersHandled.current = true;
  }, [userId, ready, pushToast]);

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      toastTimers.current.delete(id);
    }
    setToasts((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, exiting: true } : entry))
    );
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((entry) => entry.id !== id));
    }, 180);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, read: true } : entry))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((entry) => ({ ...entry, read: true })));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, dismissed: true, read: true } : entry
      )
    );
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const remindOnLogin = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? { ...entry, remindOnLogin: true, dismissed: true, read: true }
          : entry
      )
    );
  }, []);

  const clearDismissed = useCallback(() => {
    setNotifications((prev) => prev.filter((entry) => !entry.dismissed));
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((entry) => !entry.read && !entry.dismissed).length,
    [notifications]
  );

  const value = useMemo(
    () => ({
      userId,
      ready,
      notifications,
      unreadCount,
      toast,
      markRead,
      markAllRead,
      dismissNotification,
      removeNotification,
      remindOnLogin,
      clearDismissed,
    }),
    [
      userId,
      ready,
      notifications,
      unreadCount,
      toast,
      markRead,
      markAllRead,
      dismissNotification,
      removeNotification,
      remindOnLogin,
      clearDismissed,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
