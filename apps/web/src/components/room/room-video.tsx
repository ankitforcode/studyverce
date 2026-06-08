"use client";

import Link from "next/link";
import { FEATURE_FLAGS } from "@studyverce/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction, Video } from "lucide-react";

/** Phase 2 stub — LiveKit video/audio integration (Premium+) */
export function RoomVideo({
  roomId,
  roomVideoEnabled,
}: {
  roomId: string;
  roomVideoEnabled: boolean;
}) {
  if (!roomVideoEnabled) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-5 w-5" />
            Video & Audio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            In-room video streaming is available on{" "}
            <Link href="/plans" className="font-medium text-primary underline-offset-4 hover:underline">
              Premium
            </Link>
            . Upgrade to study face-to-face with your group.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!FEATURE_FLAGS.livekit) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-5 w-5" />
            Video & Audio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Construction className="h-4 w-4" />
            Video rooms are rolling out soon for Premium members (LiveKit).
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div data-room-id={roomId} className="aspect-video rounded-lg bg-secondary">
      {/* LiveKit Room component will go here */}
    </div>
  );
}

export function RoomVideoHint({ roomVideoEnabled }: { roomVideoEnabled: boolean }) {
  if (!roomVideoEnabled) {
    return (
      <Link
        href="/plans"
        className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        title="Premium unlocks in-room video streaming"
      >
        <Video className="h-3 w-3" />
        Video — Premium
      </Link>
    );
  }

  if (FEATURE_FLAGS.livekit) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary"
      title="Premium video streaming coming soon"
    >
      <Video className="h-3 w-3" />
      Video soon
    </span>
  );
}
