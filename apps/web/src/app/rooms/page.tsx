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
import { PublicPageSeo } from "@/components/seo/public-page-seo";
import { PUBLIC_BREADCRUMBS } from "@/lib/seo/breadcrumbs";

export const metadata = createSiteMetadata({
  path: "/rooms",
  title: "Browse Virtual Study Rooms",
  description:
    "Browse public and private virtual study rooms. Join live online focus sessions with shared Pomodoro timers, study music, and accountability partners.",
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
    <>
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <PublicPageSeo
          path="/rooms"
          name="Browse Virtual Study Rooms"
          description="Browse public and private virtual study rooms with shared Pomodoro timers, study music, and live accountability."
          breadcrumbs={PUBLIC_BREADCRUMBS.rooms}
        />
      </div>
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
    </>
  );
}
