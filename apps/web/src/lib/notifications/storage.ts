import type { AppNotification } from "@/lib/notifications/types";

const STORAGE_VERSION = 1;
const MAX_NOTIFICATIONS = 100;
const STORAGE_KEY_PREFIX = `studyverce-notifications-v${STORAGE_VERSION}-`;

/** Per-user localStorage key — never read/write without the active session user id. */
export function notificationsStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function loadNotifications(userId: string): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(notificationsStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNotifications(userId: string, notifications: AppNotification[]) {
  if (typeof window === "undefined") return;
  const trimmed = notifications.slice(0, MAX_NOTIFICATIONS);
  window.localStorage.setItem(notificationsStorageKey(userId), JSON.stringify(trimmed));
}

export function createNotificationId() {
  return crypto.randomUUID();
}
