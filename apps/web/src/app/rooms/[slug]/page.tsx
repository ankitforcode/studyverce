import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { joinRoom } from "@/app/rooms/actions";
import { getRoomWallpaper } from "@/app/rooms/wallpaper-actions";
import { getRoomTrack } from "@/app/rooms/music-actions";
import { getPostItForRoom, hasPostItForRoom } from "@/app/dashboard/task-actions";
import { getRoomChatHistory } from "@/app/rooms/chat-actions";
import { getRoomSidebarPanelOrder } from "@/app/rooms/sidebar-actions";
import { RoomClient } from "@/components/room/room-client";
import { mergeRoomSettings } from "@studyverce/db";
import type { StudyRoomSettings } from "@studyverce/shared";
import { resolveWallpaperOverlay } from "@/lib/wallpaper-overlay";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?redirect=/rooms/${slug}`);
  }

  const { data: room } = await supabase
    .from("study_rooms")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!room) {
    notFound();
  }

  if (!room.is_public) {
    const { data: member } = await supabase
      .from("room_members")
      .select("role")
      .eq("room_id", room.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member && room.owner_id !== user.id) {
      notFound();
    }
  }

  await joinRoom(room.id);

  const { data: membership } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .single();

  const isOwner = room.owner_id === user.id;
  const isModerator = membership?.role === "moderator" || isOwner;

  const wallpaper = await getRoomWallpaper(room.wallpaper_id);
  const track = await getRoomTrack(room.track_id);
  const chatHistory = await getRoomChatHistory(room.id);
  const sidebarPanelOrder = await getRoomSidebarPanelOrder(room.id);
  const roomTask = await getPostItForRoom(room.id);
  const hasRoomTasks = await hasPostItForRoom(room.id);
  const roomSettings = mergeRoomSettings(
    room.settings as Partial<StudyRoomSettings> | undefined
  );
  const initialWallpaperOverlay = resolveWallpaperOverlay(roomSettings);

  return (
    <RoomClient
        roomId={room.id}
        roomName={room.name}
        isPublic={room.is_public}
        currentUserId={user.id}
        isOwner={isOwner}
        isModerator={isModerator}
      initialWallpaperId={room.wallpaper_id}
      initialBackgroundUrl={wallpaper?.imageUrl ?? null}
      initialWallpaperOverlay={initialWallpaperOverlay}
      initialTrack={track}
      initialMessages={chatHistory}
      roomTask={roomTask}
      hasRoomTasks={hasRoomTasks}
      pomodoroFocusMinutes={roomSettings.pomodoroDefaults.focusMinutes}
      pomodoroBreakMinutes={roomSettings.pomodoroDefaults.breakMinutes}
      pomodoroBreaksEnabled={roomSettings.breaksEnabled}
      initialSidebarPanelOrder={sidebarPanelOrder}
    />
  );
}
