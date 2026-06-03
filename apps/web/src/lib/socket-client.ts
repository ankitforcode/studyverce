/** Socket.io client URL — same-origin in dev (via Next rewrite) unless overridden. */
export function getSocketIoClientUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:3002";
}
