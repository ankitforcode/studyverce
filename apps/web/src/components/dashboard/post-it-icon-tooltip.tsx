"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface PostItIconTooltipProps {
  label: string;
  side?: "top" | "bottom";
  align?: "center" | "start" | "end";
  className?: string;
  children: ReactElement;
}

const TOOLTIP_GAP = 6;
const TOOLTIP_Z = 9999;

export function PostItIconTooltip({
  label,
  side = "top",
  align = "center",
  className,
  children,
}: PostItIconTooltipProps) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);

  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const triggerRect = trigger.getBoundingClientRect();
    const { width, height } = tooltip.getBoundingClientRect();

    const top =
      side === "top"
        ? triggerRect.top - height - TOOLTIP_GAP
        : triggerRect.bottom + TOOLTIP_GAP;

    let left: number;
    if (align === "end") {
      left = triggerRect.right - width;
    } else if (align === "start") {
      left = triggerRect.left;
    } else {
      left = triggerRect.left + triggerRect.width / 2 - width / 2;
    }

    setPosition({ top, left });
    setVisible(true);
  }, [side, align]);

  useLayoutEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    reposition();
  }, [open, label, reposition]);

  useEffect(() => {
    if (!open) return;

    const handleReposition = () => reposition();
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open, reposition]);

  const tooltip =
    open && typeof document !== "undefined"
      ? createPortal(
          <span
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              zIndex: TOOLTIP_Z,
            }}
            className={cn(
              "pointer-events-none whitespace-nowrap rounded-md bg-[#323338] px-2 py-1 text-[10px] font-medium leading-none text-white shadow-md transition-opacity duration-75",
              visible ? "opacity-100" : "opacity-0"
            )}
          >
            {label}
          </span>,
          document.body
        )
      : null;

  return (
    <>
      <span
        ref={triggerRef}
        className={cn(
          className ? "flex" : "inline-flex",
          className
        )}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-describedby={open ? tooltipId : undefined}
      >
        {children}
      </span>
      {tooltip}
    </>
  );
}
