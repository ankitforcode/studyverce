"use client";

import { useState, useTransition } from "react";
import { Check, Clock, Music2, X } from "lucide-react";
import type { RoomTrackRequest } from "@studyverce/shared";
import { approveTrackRequest, rejectTrackRequest } from "@/app/rooms/music-actions";
import type { AppSocket } from "@/hooks/use-socket";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface RoomMusicRequestsModalProps {
  open: boolean;
  onClose: () => void;
  requests: RoomTrackRequest[];
  roomId: string;
  socket: AppSocket | null;
  onRequestsChange: (next: RoomTrackRequest[]) => void;
  onApproved: (track: NonNullable<RoomTrackRequest["track"]>) => void;
}

export function RoomMusicRequestsModal({
  open,
  onClose,
  requests,
  roomId,
  socket,
  onRequestsChange,
  onApproved,
}: RoomMusicRequestsModalProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const count = requests.length;

  function emitReview(
    requestId: string,
    userId: string,
    status: "approved" | "rejected"
  ) {
    socket?.emit("music:reviewed", { roomId, requestId, userId, status });
  }

  function handleApprove(request: RoomTrackRequest) {
    setError(null);
    startTransition(async () => {
      const result = await approveTrackRequest(request.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onRequestsChange(requests.filter((r) => r.id !== request.id));
      if (result.requestedBy) {
        emitReview(request.id, result.requestedBy, "approved");
      }
      if (result.track) {
        onApproved(result.track);
      }
    });
  }

  function handleReject(request: RoomTrackRequest) {
    setError(null);
    startTransition(async () => {
      const result = await rejectTrackRequest(request.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onRequestsChange(requests.filter((r) => r.id !== request.id));
      if (result.requestedBy) {
        emitReview(request.id, result.requestedBy, "rejected");
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          Music requests
          {count > 0 && (
            <Badge variant="default" className="h-5 px-2 text-[11px]">
              {count}
            </Badge>
          )}
        </span>
      }
      description="Review tracks members requested to play in this room."
      className="max-w-lg"
      bodyClassName={cn(count > 0 ? "px-0 py-0" : undefined)}
      footer={
        error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : count > 0 ? (
          <p className="text-xs text-muted-foreground">
            {count} {count === 1 ? "track" : "tracks"} waiting for approval
          </p>
        ) : undefined
      }
    >
      {count === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Music2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No pending requests</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            When a member requests a track, it will show up here for you to approve.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {requests.map((request) => (
            <li
              key={request.id}
              className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Music2 className="h-4 w-4 text-primary" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">
                  {request.track?.name ?? "Unknown track"}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  {request.track?.artist && (
                    <span className="truncate">{request.track.artist}</span>
                  )}
                  <span className="truncate">
                    {request.requesterName ?? "Member"}
                    {request.requesterUsername && ` · @${request.requesterUsername}`}
                  </span>
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
                  onClick={() => handleReject(request)}
                  title="Decline"
                  aria-label={`Decline ${request.track?.name ?? "track"}`}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  className="h-8 gap-1.5 px-3"
                  onClick={() => handleApprove(request)}
                >
                  <Check className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Approve</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
