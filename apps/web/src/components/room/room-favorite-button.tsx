"use client";

import { useEffect, useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleRoomFavorite } from "@/app/rooms/favorite-actions";
import { useNotifications } from "@/components/notifications/notification-provider";
import { PostItIconTooltip } from "@/components/dashboard/post-it-icon-tooltip";
import { notificationMessages } from "@/lib/notifications/messages";
import { Button } from "@/components/ui/button";
import { ROOM_HEADER_ICON_BUTTON } from "@/lib/room-ui";
import { cn } from "@/lib/utils";

interface RoomFavoriteButtonProps {
  roomId: string;
  initialFavorited?: boolean;
  variant?: "header" | "card";
  className?: string;
  onChange?: (favorited: boolean) => void;
}

export function RoomFavoriteButton({
  roomId,
  initialFavorited = false,
  variant = "header",
  className,
  onChange,
}: RoomFavoriteButtonProps) {
  const { toast } = useNotifications();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setFavorited(initialFavorited);
  }, [initialFavorited, roomId]);

  function handleToggle() {
    startTransition(async () => {
      try {
        const result = await toggleRoomFavorite(roomId);
        if (result.error) {
          toast(notificationMessages.actionError(result.error));
          return;
        }
        const next = result.favorited ?? !favorited;
        setFavorited(next);
        onChange?.(next);
        toast(next ? notificationMessages.favoriteAdded() : notificationMessages.favoriteRemoved());
      } catch {
        /* ignore aborted refetches / network blips */
      }
    });
  }

  const label = favorited ? "Remove from favorites" : "Add to favorites";

  const button = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={label}
      aria-pressed={favorited}
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleToggle();
      }}
      className={cn(
        variant === "header"
          ? ROOM_HEADER_ICON_BUTTON
          : "h-8 w-8 rounded-full border border-white/20 bg-black/50 p-0 text-white backdrop-blur-sm hover:bg-black/70",
        className
      )}
    >
      <Heart
        className={cn(
          variant === "header" ? "h-3.5 w-3.5" : "h-4 w-4",
          favorited
            ? "fill-primary text-primary"
            : variant === "card"
              ? "text-white/90"
              : "text-foreground/70 light:text-foreground/75"
        )}
      />
    </Button>
  );

  if (variant === "card") {
    return (
      <PostItIconTooltip label={label} side="bottom">
        {button}
      </PostItIconTooltip>
    );
  }

  return (
    <PostItIconTooltip label={label} side="bottom">
      {button}
    </PostItIconTooltip>
  );
}
