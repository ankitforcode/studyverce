"use client";

import type { ReactElement } from "react";
import { cn } from "@/lib/utils";

interface PostItIconTooltipProps {
  label: string;
  side?: "top" | "bottom";
  align?: "center" | "start" | "end";
  className?: string;
  children: ReactElement;
}

export function PostItIconTooltip({
  label,
  side = "top",
  align = "center",
  className,
  children,
}: PostItIconTooltipProps) {
  return (
    <span
      className={cn(
        "group/postit-tip relative",
        className ? "flex" : "inline-flex",
        className
      )}
    >
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-[100] whitespace-nowrap rounded-md bg-[#323338] px-2 py-1 text-[10px] font-medium leading-none text-white shadow-md",
          "opacity-0 transition-opacity duration-75 group-hover/postit-tip:opacity-100 group-focus-within/postit-tip:opacity-100",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
          align === "end"
            ? "right-0"
            : align === "start"
              ? "left-0"
              : "left-1/2 -translate-x-1/2"
        )}
      >
        {label}
      </span>
    </span>
  );
}
