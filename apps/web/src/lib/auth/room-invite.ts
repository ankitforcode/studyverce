/** Post-auth path for someone invited to a study room. */
export function buildRoomInviteRedirectPath(
  slug: string,
  isPublic: boolean,
  inviteToken: string | null
): string {
  if (isPublic) {
    return `/rooms/${slug}`;
  }

  if (!inviteToken) {
    return `/rooms/${slug}/invite`;
  }

  return `/rooms/${slug}/invite?token=${encodeURIComponent(inviteToken)}`;
}

export const POST_AUTH_REDIRECT_METADATA_KEY = "post_auth_redirect";
export const ROOM_INVITE_FLAG_METADATA_KEY = "room_invite";
export const ROOM_NAME_METADATA_KEY = "room_name";

export function buildRoomInviteUserMetadata(roomName: string, redirectPath: string) {
  return {
    [POST_AUTH_REDIRECT_METADATA_KEY]: redirectPath,
    [ROOM_INVITE_FLAG_METADATA_KEY]: "true",
    [ROOM_NAME_METADATA_KEY]: roomName,
  };
}
