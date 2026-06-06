"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, Suspense } from "react";
import {
  Search,
  SlidersHorizontal,
  Crown,
  Video,
  Timer,
  BookOpen,
  Users,
  Plus,
} from "lucide-react";
import type { RoomListingItem } from "@/lib/rooms/listing";
import { loginPath, signupPath } from "@/lib/auth/paths";
import { RoomFavoriteButton } from "@/components/room/room-favorite-button";
import { useRoomListingPresence } from "@/hooks/use-room-listing-presence";
import { ScrollingTrackRibbon } from "@/components/room/scrolling-track-ribbon";
import { Avatar } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tab = "trending" | "private" | "friends" | "favorites";

interface RoomsDirectoryProps {
  rooms: RoomListingItem[];
  initialQuery?: string;
  initialTab?: Tab;
  isLoggedIn?: boolean;
  favoriteRoomIds?: string[];
  removedNotice?: "inactive" | "kicked" | null;
}

function RoomsDirectoryContent({
  rooms,
  initialQuery = "",
  initialTab = "trending",
  isLoggedIn = false,
  favoriteRoomIds = [],
  removedNotice = null,
}: RoomsDirectoryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [favoriteIds, setFavoriteIds] = useState(() => new Set(favoriteRoomIds));

  const visibleRooms =
    tab === "favorites"
      ? rooms.filter((room) => favoriteIds.has(room.id))
      : rooms;
  const listingRoomIdsKey = useMemo(
    () => visibleRooms.map((room) => room.id).join(","),
    [visibleRooms]
  );
  const presenceCounts = useRoomListingPresence(listingRoomIdsKey);

  function updateSearch(newQuery: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (newQuery) params.set("q", newQuery);
    else params.delete("q");
    params.set("tab", tab);
    router.push(`/rooms?${params.toString()}`);
  }

  function switchTab(next: Tab) {
    if (!isLoggedIn && next !== "trending") return;
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    if (query) params.set("q", query);
    router.push(`/rooms?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="border-b border-border bg-background/95 backdrop-blur-md sticky top-16 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateSearch(query);
            }}
            className="relative max-w-2xl mx-auto"
          >
            <Search className="absolute left-4 top-1/2 -h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full rounded-full border border-border bg-muted py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        {removedNotice === "inactive" && (
          <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-muted-foreground">
            You were removed from a study room after 30 minutes away. Rejoin any room
            to continue studying.
          </p>
        )}
        {removedNotice === "kicked" && (
          <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-muted-foreground">
            The room owner removed you from that study room.
          </p>
        )}

        {!isLoggedIn && (
          <p className="mb-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Browsing public study rooms.{" "}
            <Link href={loginPath("/rooms")} className="font-medium text-primary hover:underline">
              Sign in
            </Link>{" "}
            or{" "}
            <Link href={signupPath("/rooms")} className="font-medium text-primary hover:underline">
              sign up
            </Link>{" "}
            to join a room or create your own.
          </p>
        )}

        {/* Tabs + create */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            {(
              [
                ["trending", "Public rooms"],
                ...(isLoggedIn
                  ? ([
                      ["private", "Private rooms"],
                      ["friends", "Friends"],
                      ["favorites", "Favorites"],
                    ] as const)
                  : []),
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => switchTab(id)}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-medium transition-all",
                  tab === id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "bg-muted text-muted-foreground hover:text-foreground border border-border"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <Link
            href={isLoggedIn ? "/rooms/new" : loginPath("/rooms/new")}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            Create Room
          </Link>
        </div>

        {/* Filters row */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-medium text-foreground">Filters</h2>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            All modes
          </button>
        </div>

        {/* Grid */}
        {visibleRooms.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                isTrending={tab === "trending"}
                tab={tab}
                isLoggedIn={isLoggedIn}
                isFavorited={favoriteIds.has(room.id)}
                liveCount={presenceCounts[room.id] ?? 0}
                onFavoriteChange={(favorited) => {
                  setFavoriteIds((prev) => {
                    const next = new Set(prev);
                    if (favorited) next.add(room.id);
                    else next.delete(room.id);
                    return next;
                  });
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card py-16 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-1">
              {tab === "private"
                ? "No private rooms yet"
                : tab === "friends"
                  ? "No friend rooms yet"
                  : tab === "favorites"
                    ? "No favorite rooms saved"
                    : "No rooms found"}
            </p>
            <p className="text-sm text-muted-foreground/70 mb-6">
              {tab === "trending"
                ? "Try a different search or create the first room"
                : tab === "private"
                  ? "Create a private room or accept an invite from a share link"
                  : tab === "friends"
                    ? "Rooms from mutual friends will appear here once that feature launches"
                    : "Star rooms from listings or inside a room to save them here"}
            </p>
            {tab === "trending" && (
              <Link
                href={isLoggedIn ? "/rooms/new" : loginPath("/rooms/new")}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Create Room
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RoomCard({
  room,
  isTrending,
  tab,
  isLoggedIn,
  isFavorited,
  liveCount,
  onFavoriteChange,
}: {
  room: RoomListingItem;
  isTrending: boolean;
  tab: Tab;
  isLoggedIn: boolean;
  isFavorited: boolean;
  liveCount: number;
  onFavoriteChange: (favorited: boolean) => void;
}) {
  const roomPath = `/rooms/${room.slug}`;
  const invitePath =
    room.inviteToken && !room.isPublic
      ? `/rooms/${room.slug}/invite?token=${encodeURIComponent(room.inviteToken)}`
      : `/rooms/${room.slug}/invite`;
  const joinHref = isLoggedIn
    ? room.joinState === "pending"
      ? invitePath
      : roomPath
    : loginPath(roomPath);
  const isPending = room.joinState === "pending";
  const roleLabel =
    tab === "private" && room.listingRole === "owned"
      ? "Your room"
      : tab === "private" && room.listingRole === "pending"
        ? "Invite pending"
        : null;
  const ModeIcon =
    room.mode.type === "camera" ? Video : room.mode.type === "study" ? BookOpen : Timer;

  const showPresence = liveCount > 0;
  const showCrown = isTrending && liveCount >= 2;

  return (
    <article className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300">
      <div className="relative">
        {/* Thumbnail — overflow hidden only on the image layer */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={room.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-black/20" />

          {showCrown && (
            <div className="absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm border border-amber-400/30">
              <Crown className="h-4 w-4 text-amber-400" />
            </div>
          )}

          {isLoggedIn && (
            <div className="absolute top-3 right-14 z-10">
              <RoomFavoriteButton
                roomId={room.id}
                initialFavorited={isFavorited}
                variant="card"
                onChange={onFavoriteChange}
              />
            </div>
          )}

          {showPresence && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/90 px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/25">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground animate-pulse" />
              {liveCount}
            </div>
          )}

          {room.nowPlaying && (
            <div className="absolute bottom-2 left-2 right-2 z-10">
              <ScrollingTrackRibbon
                trackName={room.nowPlaying.trackName}
                artist={room.nowPlaying.artist}
                isPlaying={room.nowPlaying.isPlaying}
                compact
                className="border-white/20 bg-black/55 backdrop-blur-md"
              />
            </div>
          )}
        </div>

        {/* Host avatar — outside overflow-hidden so it isn't clipped */}
        <div className="absolute bottom-0 left-4 z-10 translate-y-1/2">
          <div className="relative">
            <Avatar
              src={room.owner.avatarUrl}
              fallback={room.owner.displayName}
              size="md"
              className="ring-2 ring-card"
            />
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-primary ring-2 ring-card" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 pt-8 pb-4">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-semibold text-foreground truncate flex-1">{room.name}</h3>
          {roleLabel && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                room.listingRole === "owned"
                  ? "bg-primary/15 text-primary"
                  : "bg-amber-500/15 text-amber-200"
              )}
            >
              {roleLabel}
            </span>
          )}
        </div>
        {room.description && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">{room.description}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          <div className="flex flex-1 items-center gap-1.5 rounded-full bg-muted border border-border px-3 py-2 text-xs text-muted-foreground min-w-0">
            <ModeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{room.mode.label}</span>
          </div>
          {isPending ? (
            <Link
              href={joinHref}
              className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/10 px-5 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20 transition-colors"
            >
              Pending approval
            </Link>
          ) : (
            <Link
              href={joinHref}
              className="shrink-0 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-md shadow-primary/30"
            >
              Join
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function RoomsDirectory(props: RoomsDirectoryProps) {
  return (
    <Suspense>
      <RoomsDirectoryContent {...props} />
    </Suspense>
  );
}
