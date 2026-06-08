import type { ToastInput } from "@/lib/notifications/types";

const PENDING_TOAST_KEY = "studyverce-pending-toast";

export function queuePendingToast(input: ToastInput): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_TOAST_KEY, JSON.stringify(input));
}

export function consumePendingToast(): ToastInput | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(PENDING_TOAST_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PENDING_TOAST_KEY);
  try {
    return JSON.parse(raw) as ToastInput;
  } catch {
    return null;
  }
}
