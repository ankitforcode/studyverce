import { getAppOrigin } from "@/lib/music/oauth-config";

export function buildRoomShareUrl(
  slug: string,
  isPublic: boolean,
  inviteToken: string | null
): string {
  const origin = getAppOrigin();

  if (isPublic) {
    return `${origin}/rooms/${slug}`;
  }

  if (!inviteToken) {
    return `${origin}/rooms/${slug}/invite`;
  }

  return `${origin}/rooms/${slug}/invite?token=${encodeURIComponent(inviteToken)}`;
}
