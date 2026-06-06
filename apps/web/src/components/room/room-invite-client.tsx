"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, DoorOpen, Loader2, Users } from "lucide-react";
import type { RoomAccessRequestStatus, RoomSharePreview } from "@studyverce/shared";
import { requestRoomAccess } from "@/app/rooms/access-actions";
import { useSocket } from "@/hooks/use-socket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RoomInviteClientProps {
  preview: RoomSharePreview;
  inviteToken: string | null;
  accessStatus: RoomAccessRequestStatus | null;
}

export function RoomInviteClient({
  preview,
  inviteToken,
  accessStatus,
}: RoomInviteClientProps) {
  const router = useRouter();
  const { socket, connected } = useSocket();
  const [status, setStatus] = useState(accessStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!socket || !connected) return;

    const onReviewed = ({
      roomId,
      status: nextStatus,
    }: {
      roomId: string;
      requestId: string;
      status: RoomAccessRequestStatus;
    }) => {
      if (roomId !== preview.id) return;
      setStatus(nextStatus);
      if (nextStatus === "approved") {
        router.push(`/rooms/${preview.slug}`);
      }
    };

    socket.on("room:access-request:reviewed", onReviewed);
    return () => {
      socket.off("room:access-request:reviewed", onReviewed);
    };
  }, [socket, connected, preview.id, preview.slug, router]);

  function handleRequestAccess() {
    if (!inviteToken) {
      setError("This private room link is missing a valid token.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await requestRoomAccess(preview.slug, inviteToken);
      if (result.error) {
        setError(result.error);
        return;
      }
      setStatus("pending");
      if (result.request) {
        socket?.emit("access:request-created", {
          roomId: preview.id,
          request: result.request,
        });
      }
    });
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-lg items-center px-4 py-10 sm:px-6">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15">
              <DoorOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-xl">{preview.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Hosted by {preview.ownerDisplayName}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {preview.description && (
            <p className="text-sm text-muted-foreground">{preview.description}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Badge variant={preview.isPublic ? "default" : "secondary"}>
              {preview.isPublic ? "Public" : "Private"}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {preview.memberCount} / {preview.maxParticipants}
            </Badge>
          </div>

          {preview.isPublic ? (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                This is a public study room. Anyone signed in can join.
              </p>
              <Link
                href={`/rooms/${preview.slug}`}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Enter room
              </Link>
            </div>
          ) : status === "approved" ? (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                Your access was approved. You can enter the room now.
              </p>
              <Link
                href={`/rooms/${preview.slug}`}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Enter room
              </Link>
            </div>
          ) : status === "pending" ? (
            <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                Access request pending
              </p>
              <p className="text-sm text-muted-foreground">
                The room owner has been notified. You&apos;ll be able to enter once
                they approve your request.
              </p>
            </div>
          ) : status === "rejected" ? (
            <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
              <p className="text-sm font-medium text-destructive">Access declined</p>
              <p className="text-sm text-muted-foreground">
                The room owner declined your request. Contact them if you still need
                access.
              </p>
            </div>
          ) : (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                This is a private room. Request access and wait for the owner to
                approve before you can join.
              </p>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="button"
                className="w-full"
                disabled={pending || !inviteToken}
                onClick={handleRequestAccess}
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Requesting…
                  </>
                ) : (
                  "Request access"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
