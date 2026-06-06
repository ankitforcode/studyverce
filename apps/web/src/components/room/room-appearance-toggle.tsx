"use client";

import { Moon, Sun } from "lucide-react";
import { PostItIconTooltip } from "@/components/dashboard/post-it-icon-tooltip";
import { Button } from "@/components/ui/button";
import { ROOM_HEADER_CONTROL } from "@/lib/room-ui";
import { cn } from "@/lib/utils";
import type { RoomAppearance } from "@/lib/room-appearance";

interface RoomAppearanceToggleProps {
  appearance: RoomAppearance;
  onChange: (mode: RoomAppearance) => void;
  className?: string;
}

export function RoomAppearanceToggle({
  appearance,
  onChange,
  className,
}: RoomAppearanceToggleProps) {
  return (
    <div
      role="group"
      aria-label="Room appearance"
      className={cn(
        "inline-flex p-0.5",
        ROOM_HEADER_CONTROL,
        className
      )}
    >
      <PostItIconTooltip label="Light mode" side="bottom">
        <Button
          type="button"
          variant={appearance === "light" ? "default" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          aria-label="Light mode"
          aria-pressed={appearance === "light"}
          onClick={() => onChange("light")}
        >
          <Sun className="h-3.5 w-3.5" />
        </Button>
      </PostItIconTooltip>
      <PostItIconTooltip label="Dark mode" side="bottom">
        <Button
          type="button"
          variant={appearance === "dark" ? "default" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          aria-label="Dark mode"
          aria-pressed={appearance === "dark"}
          onClick={() => onChange("dark")}
        >
          <Moon className="h-3.5 w-3.5" />
        </Button>
      </PostItIconTooltip>
    </div>
  );
}
