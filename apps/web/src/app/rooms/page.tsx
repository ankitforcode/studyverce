import { createClient } from "@/lib/supabase/server";
import {
  getPublicRooms,
  getFriendRooms,
  getFavoriteRooms,
} from "@/lib/rooms/listing";
import { RoomsDirectory } from "@/components/rooms/rooms-directory";

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
    isLoggedIn && (tabParam === "friends" || tabParam === "favorites")
      ? tabParam
      : "trending";

  let rooms = await getPublicRooms(q);

  if (isLoggedIn && tab === "friends") {
    rooms = await getFriendRooms(user.id);
  } else if (isLoggedIn && tab === "favorites") {
    rooms = await getFavoriteRooms(user.id);
  }

  return (
    <RoomsDirectory
      rooms={rooms}
      initialQuery={q ?? ""}
      initialTab={tab}
      isLoggedIn={isLoggedIn}
      removedNotice={removed === "inactive" ? "inactive" : null}
    />
  );
}
