import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getMyRoomAccessStatus,
  getRoomSharePreview,
} from "@/app/rooms/access-actions";
import { RoomInviteClient } from "@/components/room/room-invite-client";

export const dynamic = "force-dynamic";

export default async function RoomInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug } = await params;
  const { token } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectTarget = token
    ? `/rooms/${slug}/invite?token=${encodeURIComponent(token)}`
    : `/rooms/${slug}/invite`;

  if (!user) {
    redirect(`/auth/login?redirect=${encodeURIComponent(redirectTarget)}`);
  }

  const preview = await getRoomSharePreview(slug, token ?? null);
  if (!preview) {
    notFound();
  }

  const { data: member } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", preview.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (member || preview.ownerId === user.id) {
    redirect(`/rooms/${slug}`);
  }

  if (preview.isPublic) {
    redirect(`/rooms/${slug}`);
  }

  const accessStatus = await getMyRoomAccessStatus(preview.id);

  if (accessStatus === "approved") {
    redirect(`/rooms/${slug}`);
  }

  return (
    <RoomInviteClient
      preview={preview}
      inviteToken={token ?? null}
      accessStatus={accessStatus}
    />
  );
}
