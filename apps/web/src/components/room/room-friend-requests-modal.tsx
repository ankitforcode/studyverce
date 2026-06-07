"use client";

import { useState, useTransition } from "react";
import { Check, Clock, Handshake, X } from "lucide-react";
import type { RoomFriendRequest } from "@studyverce/shared";
import {
  acceptFriendRequest,
  declineFriendRequest,
} from "@/app/friends/actions";
import { useNotifications } from "@/components/notifications/notification-provider";
import type { AppSocket } from "@/hooks/use-socket";
import { notificationMessages } from "@/lib/notifications/messages";
import { Modal } from "@/components/ui/modal";
import { Avatar, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface RoomFriendRequestsModalProps {
  open: boolean;
  onClose: () => void;
  requests: RoomFriendRequest[];
  roomId: string;
  socket: AppSocket | null;
  onRequestsChange: (next: RoomFriendRequest[]) => void;
}

export function RoomFriendRequestsModal({
  open,
  onClose,
  requests,
  roomId,
  socket,
  onRequestsChange,
}: RoomFriendRequestsModalProps) {
  const { toast } = useNotifications();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const count = requests.length;

  function emitReview(requesterId: string, status: "accepted" | "declined") {
    socket?.emit("friend:reviewed", { roomId, requesterId, status });
  }

  function handleAccept(request: RoomFriendRequest) {
    setError(null);
    startTransition(async () => {
      const result = await acceptFriendRequest(request.userId);
      if (result.error) {
        setError(result.error);
        toast(notificationMessages.actionError(result.error));
        return;
      }
      onRequestsChange(requests.filter((entry) => entry.userId !== request.userId));
      toast(notificationMessages.friendRequestAccepted(request.displayName));
      emitReview(request.userId, "accepted");
    });
  }

  function handleDecline(request: RoomFriendRequest) {
    setError(null);
    startTransition(async () => {
      const result = await declineFriendRequest(request.userId);
      if (result.error) {
        setError(result.error);
        toast(notificationMessages.actionError(result.error));
        return;
      }
      onRequestsChange(requests.filter((entry) => entry.userId !== request.userId));
      toast(notificationMessages.friendRequestDeclined(request.displayName));
      emitReview(request.userId, "declined");
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          Friend requests
          {count > 0 && (
            <Badge variant="default" className="h-5 px-2 text-[11px]">
              {count}
            </Badge>
          )}
        </span>
      }
      description="People in this room want to connect with you."
      className="max-w-lg"
      bodyClassName={cn(count > 0 ? "px-0 py-0" : undefined)}
      footer={
        error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : count > 0 ? (
          <p className="text-xs text-muted-foreground">
            {count} {count === 1 ? "person" : "people"} waiting for your response
          </p>
        ) : undefined
      }
    >
      {count === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Handshake className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No pending requests</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            When someone in this room sends you a friend request, it will show up here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {requests.map((request) => (
            <li
              key={request.userId}
              className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30"
            >
              <Avatar
                src={request.avatarUrl}
                fallback={request.displayName}
                size="sm"
                className="shrink-0"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{request.displayName}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="truncate">@{request.username}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3 shrink-0" />
                    {format(new Date(request.createdAt), "MMM d, h:mm a")}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleDecline(request)}
                  title="Decline"
                  aria-label={`Decline ${request.displayName}`}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  className="h-8 gap-1.5 px-3"
                  onClick={() => handleAccept(request)}
                >
                  <Check className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Accept</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
