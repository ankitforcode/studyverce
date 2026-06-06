import { createClient } from "@/lib/supabase/server";
import { createSiteMetadata } from "@/lib/site-metadata";
import {
  getPublicRooms,
  getPrivateRooms,
  getFriendRooms,
  getFavoriteRooms,
} from "@/lib/rooms/listing";
import { getFavoriteRoomIds } from "@/app/rooms/favorite-actions";
import { RoomsDirectory } from "@/components/rooms/rooms-directory";

export const metadata = createSiteMetadata({
  title: "Study Rooms",
  description:
    "Browse public and private virtual study rooms. Join live sessions with Pomodoro timers, music, and study partners.",
  openGraph: {
    title: "Study Rooms | StudyVerce",
    description:
      "Browse public and private virtual study rooms. Join live sessions with Pomodoro timers, music, and study partners.",
  },
});

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string; removed?: string }>;
}) {
  const { q, tab: tabParam = "trending", removed } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;
  const tab =
    isLoggedIn &&
    (tabParam === "private" || tabParam === "friends" || tabParam === "favorites")
      ? tabParam
      : "trending";

  let rooms = await getPublicRooms(q);

  if (isLoggedIn && tab === "private") {
    rooms = await getPrivateRooms(user.id);
  } else if (isLoggedIn && tab === "friends") {
    rooms = await getFriendRooms(user.id);
  } else if (isLoggedIn && tab === "favorites") {
    rooms = await getFavoriteRooms(user.id);
  }

  const favoriteRoomIds = isLoggedIn ? await getFavoriteRoomIds() : [];

  return (
    <RoomsDirectory
      rooms={rooms}
      initialQuery={q ?? ""}
      initialTab={tab}
      isLoggedIn={isLoggedIn}
      favoriteRoomIds={favoriteRoomIds}
      removedNotice={
        removed === "inactive" ? "inactive" : removed === "kicked" ? "kicked" : null
      }
    />
  );
}
