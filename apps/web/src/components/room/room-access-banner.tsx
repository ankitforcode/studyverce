"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import type { RoomAccessRequest } from "@studyverce/shared";
import { getPendingAccessRequests } from "@/app/rooms/access-actions";
import { PostItIconTooltip } from "@/components/dashboard/post-it-icon-tooltip";
import { RoomAccessRequestsModal } from "@/components/room/room-access-requests-modal";
import type { AppSocket } from "@/hooks/use-socket";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RoomAccessBannerProps {
  roomId: string;
  isOwner: boolean;
  socket: AppSocket | null;
  connected: boolean;
  className?: string;
}

export function RoomAccessBanner({
  roomId,
  isOwner,
  socket,
  connected,
  className,
}: RoomAccessBannerProps) {
  const [requests, setRequests] = useState<RoomAccessRequest[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!isOwner) return;
    const data = await getPendingAccessRequests(roomId);
    setRequests(data);
  }, [isOwner, roomId]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!socket || !connected || !isOwner) return;

    const onNew = ({ request }: { request: RoomAccessRequest }) => {
      if (request.roomId !== roomId) return;
      setRequests((prev) => {
        if (prev.some((r) => r.id === request.id)) return prev;
        return [...prev, request];
      });
    };

    const onRemoved = ({ requestId }: { requestId: string }) => {
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    };

    socket.on("room:access-request:new", onNew);
    socket.on("room:access-request:removed", onRemoved);

    return () => {
      socket.off("room:access-request:new", onNew);
      socket.off("room:access-request:removed", onRemoved);
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
        label={`${requests.length} access request${requests.length === 1 ? "" : "s"}`}
        side="bottom"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`${requests.length} pending access requests`}
          onClick={() => setModalOpen(true)}
          className={cn(
            "relative h-8 w-8 border-primary/30 bg-primary/5 p-0 hover:bg-primary/10",
            className
          )}
        >
          <UserPlus className="h-3.5 w-3.5 text-primary" />
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold leading-none text-primary-foreground">
            {requests.length}
          </span>
        </Button>
      </PostItIconTooltip>

      <RoomAccessRequestsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        requests={requests}
        roomId={roomId}
        socket={socket}
        onRequestsChange={setRequests}
      />
    </>
  );
}
