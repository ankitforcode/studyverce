"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Handshake } from "lucide-react";
import type { RoomFriendRequest, RoomParticipant } from "@studyverce/shared";
import { getPendingFriendRequestsInRoom } from "@/app/friends/actions";
import { PostItIconTooltip } from "@/components/dashboard/post-it-icon-tooltip";
import { RoomFriendRequestsModal } from "@/components/room/room-friend-requests-modal";
import type { AppSocket } from "@/hooks/use-socket";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function toRoomFriendRequest(
  request: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    createdAt: string;
  },
  roomId: string
): RoomFriendRequest {
  return {
    userId: request.userId,
    username: request.username,
    displayName: request.displayName,
    avatarUrl: request.avatarUrl,
    roomId,
    createdAt: request.createdAt,
  };
}

interface RoomFriendRequestsBannerProps {
  roomId: string;
  currentUserId: string;
  participants: RoomParticipant[];
  socket: AppSocket | null;
  connected: boolean;
  className?: string;
}

export function RoomFriendRequestsBanner({
  roomId,
  currentUserId,
  participants,
  socket,
  connected,
  className,
}: RoomFriendRequestsBannerProps) {
  const [requests, setRequests] = useState<RoomFriendRequest[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const participantUserIds = useMemo(
    () =>
      participants
        .filter((participant) => participant.userId !== currentUserId)
        .map((participant) => participant.userId),
    [participants, currentUserId]
  );

  const loadRequests = useCallback(async () => {
    const data = await getPendingFriendRequestsInRoom(participantUserIds);
    setRequests(data.map((request) => toRoomFriendRequest(request, roomId)));
  }, [participantUserIds, roomId]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!socket || !connected) return;

    const onNew = ({ request }: { request: RoomFriendRequest }) => {
      if (request.roomId !== roomId) return;
      if (!participantUserIds.includes(request.userId)) return;
      setRequests((prev) => {
        if (prev.some((entry) => entry.userId === request.userId)) return prev;
        return [...prev, request];
      });
    };

    const onRemoved = ({ requesterId }: { requesterId: string }) => {
      setRequests((prev) => prev.filter((entry) => entry.userId !== requesterId));
    };

    socket.on("room:friend-request:new", onNew);
    socket.on("room:friend-request:removed", onRemoved);

    return () => {
      socket.off("room:friend-request:new", onNew);
      socket.off("room:friend-request:removed", onRemoved);
    };
  }, [socket, connected, roomId, participantUserIds]);

  useEffect(() => {
    if (requests.length === 0) {
      setModalOpen(false);
    }
  }, [requests.length]);

  useEffect(() => {
    setRequests((prev) =>
      prev.filter((request) => participantUserIds.includes(request.userId))
    );
  }, [participantUserIds]);

  if (requests.length === 0) {
    return null;
  }

  return (
    <>
      <PostItIconTooltip
        label={`${requests.length} friend request${requests.length === 1 ? "" : "s"}`}
        side="bottom"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`${requests.length} pending friend requests`}
          onClick={() => setModalOpen(true)}
          className={cn(
            "relative h-8 w-8 border-primary/30 bg-primary/5 p-0 hover:bg-primary/10",
            className
          )}
        >
          <Handshake className="h-3.5 w-3.5 text-primary" />
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold leading-none text-primary-foreground">
            {requests.length}
          </span>
        </Button>
      </PostItIconTooltip>

      <RoomFriendRequestsModal
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
