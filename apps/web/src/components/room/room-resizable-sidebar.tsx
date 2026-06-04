"use client";

import type { CSSProperties, ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { useRoomSidebarWidth } from "@/hooks/use-room-sidebar-width";
import { ROOM_CHROME_PANEL } from "@/lib/room-ui";
import { cn } from "@/lib/utils";

interface RoomResizableSidebarProps {
  children: ReactNode;
  className?: string;
}

export function RoomResizableSidebar({
  children,
  className,
}: RoomResizableSidebarProps) {
  const { width, isResizing, startResize } = useRoomSidebarWidth();

  return (
    <aside
      style={
        {
          "--room-sidebar-width": `${width}px`,
        } as CSSProperties
      }
      className={cn(
        "relative flex min-h-0 w-full min-w-0 flex-col border-t border-border/50",
        "lg:w-[var(--room-sidebar-width)] lg:shrink-0 lg:border-l lg:border-t-0",
        isResizing && "lg:transition-none",
        ROOM_CHROME_PANEL,
        className
      )}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        aria-valuenow={width}
        tabIndex={0}
        onPointerDown={startResize}
        className={cn(
          "absolute -left-1.5 top-0 z-40 hidden h-full w-3 touch-none cursor-col-resize items-center justify-center lg:flex",
          "group/resize hover:bg-primary/10",
          isResizing && "bg-primary/15"
        )}
      >
        <span
          className={cn(
            "flex h-10 w-1.5 items-center justify-center rounded-full bg-border/80 transition-colors",
            "group-hover/resize:bg-primary/50",
            isResizing && "bg-primary"
          )}
        >
          <GripVertical
            className="h-3 w-3 rotate-90 text-muted-foreground/80 group-hover/resize:text-primary"
            aria-hidden
          />
        </span>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </aside>
  );
}
