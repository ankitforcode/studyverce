import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { joinRoom } from "@/app/rooms/actions";
import { getRoomAccessStateForUser } from "@/app/rooms/access-actions";
import { isRoomFavorited } from "@/app/rooms/favorite-actions";
import { RoomAccessPending } from "@/components/room/room-access-pending";
import { RoomAccessRemoved } from "@/components/room/room-access-removed";
import { getRoomWallpaper } from "@/app/rooms/wallpaper-actions";
import { getRoomTrack } from "@/app/rooms/music-actions";
import { getPostItForRoom, hasPostItForRoom } from "@/app/dashboard/task-actions";
import { getRoomChatHistory } from "@/app/rooms/chat-actions";
import { getRoomSidebarPanelOrder } from "@/app/rooms/sidebar-actions";
import { RoomClient } from "@/components/room/room-client";
import { mergeRoomSettings } from "@studyverce/db";
import type { StudyRoomSettings } from "@studyverce/shared";
import { resolveWallpaperOverlay } from "@/lib/wallpaper-overlay";
import {
  fetchUserEntitlement,
  fetchUserPlanTier,
  hasRoomVideo,
  hasVoiceNotes,
} from "@/lib/plan-limits";
import type { PremiumSource } from "@studyverce/shared";
import { createSiteMetadata, NOINDEX_ROBOTS } from "@/lib/site-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: room } = await supabase
    .from("study_rooms")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();

  const roomName = room?.name?.trim() || "Study Room";

  return createSiteMetadata({
    path: `/rooms/${slug}`,
    title: `${roomName} — Study Room`,
    description: `Study in ${roomName} on StudyVerce with a shared Pomodoro timer, chat, post-it tasks, and focus music.`,
    robots: NOINDEX_ROBOTS,
  });
}

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

  const accessState = await getRoomAccessStateForUser(slug);
  if (!accessState) {
    notFound();
  }

  if (!accessState.isPublic && !accessState.hasMembership) {
    if (accessState.accessStatus === "pending") {
      return <RoomAccessPending roomName={accessState.roomName} />;
    }
    if (accessState.accessStatus === "revoked") {
      return <RoomAccessRemoved roomName={accessState.roomName} />;
    }
    if (accessState.accessStatus === "approved") {
      const joinResult = await joinRoom(accessState.roomId);
      if (joinResult.error) {
        notFound();
      }
    } else {
      notFound();
    }
  }

  const { data: room } = await supabase
    .from("study_rooms")
    .select("*")
    .eq("id", accessState.roomId)
    .single();

  if (!room) {
    notFound();
  }

  const isOwner = room.owner_id === user.id;

  const { data: membership } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership && !isOwner) {
    await joinRoom(room.id);
  }

  const { data: membershipAfterJoin } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .single();

  const isModerator = membershipAfterJoin?.role === "moderator" || isOwner;

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
  const initialFavorited = await isRoomFavorited(room.id);
  const planTier = await fetchUserPlanTier(supabase, user.id);
  const entitlement = await fetchUserEntitlement(supabase, user.id);
  const { data: profile } = await supabase
    .from("profiles")
    .select("subject_tags")
    .eq("id", user.id)
    .single();

  const { data: userAchievementRows } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", user.id);

  let ambassadorAchievements: { slug: string; name: string; icon: string }[] = [];
  const achievementIds = (userAchievementRows ?? []).map((row) => row.achievement_id);
  if (achievementIds.length > 0) {
    const { data: achievementRows } = await supabase
      .from("achievements")
      .select("slug, name, icon")
      .in("id", achievementIds)
      .eq("slug", "referrals_10");
    ambassadorAchievements = achievementRows ?? [];
  }

  const currentUserBadge = entitlement
    ? {
        planTier: entitlement.plan_tier,
        premiumUntil: entitlement.premium_until,
        premiumSource: entitlement.premium_source as PremiumSource,
        achievements: ambassadorAchievements,
      }
    : undefined;

  return (
    <RoomClient
      roomId={room.id}
      roomSlug={room.slug}
      roomName={room.name}
      isPublic={room.is_public}
      inviteToken={isOwner ? room.invite_token : null}
      currentUserId={user.id}
      roomOwnerId={room.owner_id}
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
      initialFavorited={initialFavorited}
      roomVideoEnabled={hasRoomVideo(planTier)}
      voiceNotesEnabled={hasVoiceNotes(planTier)}
      subjectTags={profile?.subject_tags ?? []}
      currentUserBadge={currentUserBadge}
    />
  );
}
