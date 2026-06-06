"use client";

import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import type { PomodoroState } from "@studyverce/shared";
import { Button } from "@/components/ui/button";
import { PomodoroWaterCircle } from "@/components/room/pomodoro-water-circle";
import { formatTimer } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PomodoroTimerProps {
  state: PomodoroState | null;
  onStart: (phase: "focus" | "break") => void;
  onPause: () => void;
  onReset: () => void;
  breaksEnabled?: boolean;
  className?: string;
}

const PHASE_BADGE: Record<
  "idle" | "focus" | "break",
  { label: string; className: string }
> = {
  idle: {
    label: "Ready",
    className:
      "border-border/60 bg-muted/40 text-muted-foreground",
  },
  focus: {
    label: "Focus",
    className:
      "border-primary/30 bg-primary/15 text-primary",
  },
  break: {
    label: "Break",
    className:
      "border-accent/30 bg-accent/15 text-accent",
  },
};

export function PomodoroTimer({
  state,
  onStart,
  onPause,
  onReset,
  breaksEnabled = true,
  className,
}: PomodoroTimerProps) {
  const phase = state?.phase ?? "idle";
  const remaining = state?.remainingSeconds ?? 25 * 60;
  const isPaused = state?.isPaused ?? false;
  const focusMinutes = state?.focusMinutes ?? 25;
  const breakMinutes = state?.breakMinutes ?? 5;
  const totalSeconds = phase === "break" ? breakMinutes * 60 : focusMinutes * 60;
  const fillLevel =
    phase === "idle"
      ? 0
      : totalSeconds > 0
        ? remaining / totalSeconds
        : 0;

  const badge = PHASE_BADGE[phase];

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-border/45 backdrop-blur-xl",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/35 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Timer className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
            Focus Session
          </h2>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
            badge.className
          )}
        >
          {badge.label}
        </span>
      </div>

      <div className="flex flex-col items-center gap-6 px-5 py-6">
        <PomodoroWaterCircle
          fillLevel={fillLevel}
          phase={phase}
          timeLabel={formatTimer(remaining)}
          isPaused={isPaused}
        />

        <div className="w-full space-y-3">
          {phase === "idle" ? (
            <div className="flex justify-center">
              <Button
                onClick={() => onStart("focus")}
                size="lg"
                className="h-12 min-w-[10.5rem] gap-2 rounded-xl px-8 text-base font-semibold shadow-md shadow-primary/20"
              >
                <Play className="h-4 w-4 fill-current" />
                Start Focus
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={onPause}
                className="h-11 gap-2 rounded-xl border border-border/50 bg-card/60 light:bg-white/90"
              >
                <Pause className="h-4 w-4" />
                {isPaused ? "Resume" : "Pause"}
              </Button>
              <Button
                variant="outline"
                onClick={onReset}
                className="h-11 gap-2 rounded-xl border-border/50 bg-transparent"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          <span>{focusMinutes} min focus</span>
          {breaksEnabled && (
            <>
              <span className="mx-1.5 text-border">·</span>
              <span>{breakMinutes} min break</span>
            </>
          )}
          <span className="mx-1.5 text-border">·</span>
          <span>your timer only</span>
        </p>
      </div>
    </div>
  );
}
