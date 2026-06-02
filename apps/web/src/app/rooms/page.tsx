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
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const { q, tab = "trending" } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let rooms = await getPublicRooms(q);

  if (tab === "friends" && user) {
    rooms = await getFriendRooms(user.id);
  } else if (tab === "favorites" && user) {
    rooms = await getFavoriteRooms(user.id);
  }

  return (
    <RoomsDirectory
      rooms={rooms}
      initialQuery={q ?? ""}
      initialTab={tab as "trending" | "friends" | "favorites"}
    />
  );
}
