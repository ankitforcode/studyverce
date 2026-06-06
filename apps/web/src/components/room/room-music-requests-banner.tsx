"use client";

import { useCallback, useEffect, useState } from "react";
import { Music2 } from "lucide-react";
import type { RoomTrackRequest } from "@studyverce/shared";
import { getPendingTrackRequests } from "@/app/rooms/music-actions";
import { PostItIconTooltip } from "@/components/dashboard/post-it-icon-tooltip";
import { RoomMusicRequestsModal } from "@/components/room/room-music-requests-modal";
import type { AppSocket } from "@/hooks/use-socket";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RoomMusicRequestsBannerProps {
  roomId: string;
  isOwner: boolean;
  socket: AppSocket | null;
  connected: boolean;
  onApproved: (track: NonNullable<RoomTrackRequest["track"]>) => void;
  className?: string;
}

export function RoomMusicRequestsBanner({
  roomId,
  isOwner,
  socket,
  connected,
  onApproved,
  className,
}: RoomMusicRequestsBannerProps) {
  const [requests, setRequests] = useState<RoomTrackRequest[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!isOwner) return;
    const data = await getPendingTrackRequests(roomId);
    setRequests(data);
  }, [isOwner, roomId]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!socket || !connected || !isOwner) return;

    const onNew = ({ request }: { request: RoomTrackRequest }) => {
      if (request.roomId !== roomId) return;
      setRequests((prev) => {
        if (prev.some((r) => r.id === request.id)) return prev;
        return [...prev, request];
      });
    };

    const onRemoved = ({ requestId }: { requestId: string }) => {
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    };

    socket.on("room:music-request:new", onNew);
    socket.on("room:music-request:removed", onRemoved);

    return () => {
      socket.off("room:music-request:new", onNew);
      socket.off("room:music-request:removed", onRemoved);
    };
  }, [socket, connected, isOwner, roomId]);

  useEffect(() => {
    if (requests.length === 0) {
      setModalOpen(false);
    }
  }, [requests.length]);

  if (!isOwner || requests.length === 0) {
    return null;
  }

  return (
    <>
      <PostItIconTooltip
        label={`${requests.length} music request${requests.length === 1 ? "" : "s"}`}
        side="bottom"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`${requests.length} pending music requests`}
          onClick={() => setModalOpen(true)}
          className={cn(
            "relative h-8 w-8 border-primary/30 bg-primary/5 p-0 hover:bg-primary/10",
            className
          )}
        >
          <Music2 className="h-3.5 w-3.5 text-primary" />
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold leading-none text-primary-foreground">
            {requests.length}
          </span>
        </Button>
      </PostItIconTooltip>

      <RoomMusicRequestsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        requests={requests}
        roomId={roomId}
        socket={socket}
        onRequestsChange={setRequests}
        onApproved={onApproved}
      />
    </>
  );
}
