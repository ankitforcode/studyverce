"use server";

import { createClient } from "@/lib/supabase/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { createServiceClient } from "@/lib/supabase/service";
import { authCallbackUrl } from "@/lib/auth/paths";
import {
  buildRoomInviteRedirectPath,
  buildRoomInviteUserMetadata,
} from "@/lib/auth/room-invite";

function isAlreadyRegisteredError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("user already exists")
  );
}

function isInvalidServiceRoleError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("invalid jwt") ||
    lower.includes("signature is invalid") ||
    lower.includes("bad_jwt")
  );
}

async function assertCanShareRoom(
  roomId: string,
  userId: string
): Promise<
  | { error: string }
  | { room: { slug: string; name: string; is_public: boolean; invite_token: string | null } }
> {
  const supabase = await createClient();

  const { data: room, error } = await supabase
    .from("study_rooms")
    .select("slug, name, is_public, invite_token, owner_id")
    .eq("id", roomId)
    .single();

  if (error || !room) return { error: "Room not found" };

  const isOwner = room.owner_id === userId;

  if (!room.is_public) {
    if (!isOwner) {
      return { error: "Only the room owner can invite people to a private room." };
    }
  } else if (!isOwner) {
    const { data: membership } = await supabase
      .from("room_members")
      .select("room_id")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      return { error: "Join the room before inviting others." };
    }
  }

  return {
    room: {
      slug: room.slug,
      name: room.name,
      is_public: room.is_public,
      invite_token: room.invite_token,
    },
  };
}

async function sendExistingUserRoomInvite(
  email: string,
  redirectPath: string,
  roomName: string
): Promise<{ error: string | null }> {
  const anon = createAnonClient();
  const metadata = buildRoomInviteUserMetadata(roomName, redirectPath);

  const { error } = await anon.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: authCallbackUrl(redirectPath),
      shouldCreateUser: false,
      data: metadata,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

async function sendNewUserRoomInvite(
  email: string,
  redirectPath: string,
  roomName: string
): Promise<{ error: string | null }> {
  const admin = createServiceClient();
  const metadata = buildRoomInviteUserMetadata(roomName, redirectPath);

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: authCallbackUrl("/auth/accept-invite"),
    data: metadata,
  });

  if (error) {
    if (isInvalidServiceRoleError(error.message)) {
      return {
        error:
          "SUPABASE_SERVICE_ROLE_KEY does not match this Supabase instance. Run `supabase status` and update apps/web/.env.local.",
      };
    }
    return { error: error.message };
  }

  return { error: null };
}

export async function sendRoomEmailInvite(
  roomId: string,
  email: string
): Promise<{ error: string | null; audience?: "new" | "existing" }> {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const access = await assertCanShareRoom(roomId, user.id);
  if ("error" in access) return { error: access.error };

  const { room } = access;
  const redirectPath = buildRoomInviteRedirectPath(
    room.slug,
    room.is_public,
    room.invite_token
  );

  try {
    const newUserResult = await sendNewUserRoomInvite(normalized, redirectPath, room.name);

    if (!newUserResult.error) {
      return { error: null, audience: "new" };
    }

    if (isAlreadyRegisteredError(newUserResult.error)) {
      const existingResult = await sendExistingUserRoomInvite(
        normalized,
        redirectPath,
        room.name
      );
      return existingResult.error
        ? existingResult
        : { error: null, audience: "existing" };
    }

    return newUserResult;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Could not send invite.";
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY") || isInvalidServiceRoleError(message)) {
      return {
        error:
          "Email invites for new users need SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local (from `supabase status`).",
      };
    }
    return { error: message };
  }
}
