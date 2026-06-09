/** Normalize a profile URL segment to the stored username format. */
export function normalizeProfileUsername(raw: string): string {
  try {
    return decodeURIComponent(raw).trim().replace(/^@+/, "").toLowerCase();
  } catch {
    return raw.trim().replace(/^@+/, "").toLowerCase();
  }
}
