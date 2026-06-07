import type { AppNotification } from "@/lib/notifications/types";

const STORAGE_VERSION = 1;
const MAX_NOTIFICATIONS = 100;

function storageKey(userId: string) {
  return `studyverce-notifications-v${STORAGE_VERSION}-${userId}`;
}

export function loadNotifications(userId: string): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
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
  window.localStorage.setItem(storageKey(userId), JSON.stringify(trimmed));
}

export function createNotificationId() {
  return crypto.randomUUID();
}
