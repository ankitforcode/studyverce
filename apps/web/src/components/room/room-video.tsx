"use client";

import { FEATURE_FLAGS } from "@studyverce/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Construction } from "lucide-react";

/** Phase 2 stub — LiveKit video/audio integration */
export function RoomVideo({ roomId }: { roomId: string }) {
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Construction className="h-4 w-4" />
            Video rooms coming in Phase 2 (LiveKit)
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div data-room-id={roomId} className="aspect-video bg-secondary rounded-lg">
      {/* LiveKit Room component will go here */}
    </div>
  );
}

export function RoomVideoHint() {
  if (FEATURE_FLAGS.livekit) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground"
      title="Video & audio rooms coming in Phase 2"
    >
      <Video className="h-3 w-3" />
      Video soon
    </span>
  );
}
