"use client";

import { useState, useTransition } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { getRoomShareLink } from "@/app/rooms/access-actions";
import { PostItIconTooltip } from "@/components/dashboard/post-it-icon-tooltip";
import { buildRoomShareUrl } from "@/lib/room-share";
import { Button } from "@/components/ui/button";
import { ROOM_HEADER_ICON_BUTTON } from "@/lib/room-ui";
import { cn } from "@/lib/utils";

interface RoomShareLinkProps {
  roomId: string;
  slug: string;
  isPublic: boolean;
  inviteToken: string | null;
  className?: string;
}

export function RoomShareLink({
  roomId,
  slug,
  isPublic,
  inviteToken,
  className,
}: RoomShareLinkProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCopy() {
    setError(null);
    startTransition(async () => {
      const fallbackUrl = buildRoomShareUrl(slug, isPublic, inviteToken);
      const result = await getRoomShareLink(roomId);
      const url = result.url ?? fallbackUrl;

      if (result.error && !result.url) {
        setError(result.error);
        return;
      }

      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        setError("Could not copy link. Try again.");
      }
    });
  }

  const label = copied ? "Link copied" : "Share";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <PostItIconTooltip label={label} side="bottom">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={label}
          onClick={handleCopy}
          disabled={pending}
          className={ROOM_HEADER_ICON_BUTTON}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Share2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </PostItIconTooltip>
      {error && (
        <span className="text-xs text-destructive" title={error}>
          <Link2 className="inline h-3 w-3" />
        </span>
      )}
    </div>
  );
}
