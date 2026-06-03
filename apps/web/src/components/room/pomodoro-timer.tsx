"use client";

import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import type { PomodoroState } from "@studyverce/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTimer } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PomodoroTimerProps {
  state: PomodoroState | null;
  onStart: (phase: "focus" | "break") => void;
  onPause: () => void;
  onReset: () => void;
  goalText?: string;
  onGoalChange?: (goal: string) => void;
  className?: string;
}

export function PomodoroTimer({
  state,
  onStart,
  onPause,
  onReset,
  goalText,
  onGoalChange,
  className,
}: PomodoroTimerProps) {
  const phase = state?.phase ?? "idle";
  const remaining = state?.remainingSeconds ?? 25 * 60;
  const isPaused = state?.isPaused ?? false;
  const focusMinutes = state?.focusMinutes ?? 25;
  const breakMinutes = state?.breakMinutes ?? 5;
  const totalSeconds = phase === "break" ? breakMinutes * 60 : focusMinutes * 60;
  const progress =
    phase === "idle" ? 0 : Math.max(0, Math.min(1, 1 - remaining / totalSeconds));

  const phaseColors = {
    idle: "text-muted-foreground",
    focus: "text-primary",
    break: "text-accent",
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-center gap-2 text-lg">
          <Timer className="h-5 w-5" />
          Focus Session
          <Badge variant={phase === "focus" ? "default" : phase === "break" ? "accent" : "secondary"}>
            {phase === "idle" ? "Ready" : phase === "focus" ? "Focus" : "Break"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative mx-auto h-44 w-44 sm:h-48 sm:w-48">
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-border/60"
            />
            {progress > 0 && (
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${progress * 264} 264`}
                className={phase === "break" ? "text-accent" : "text-primary"}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <span
              className={cn(
                "font-mono text-4xl font-bold tabular-nums leading-none tracking-tight sm:text-5xl",
                phaseColors[phase]
              )}
            >
              {formatTimer(remaining)}
            </span>
          </div>
        </div>

        {onGoalChange && (
          <input
            type="text"
            placeholder="What are you working on?"
            value={goalText ?? ""}
            onChange={(e) => onGoalChange(e.target.value)}
            className="w-full rounded-lg border border-input bg-background/80 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}

        <div className="flex flex-wrap justify-center gap-2">
          {phase === "idle" ? (
            <Button onClick={() => onStart("focus")} size="lg" className="gap-2 min-w-[140px]">
              <Play className="h-4 w-4" />
              Start Focus
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onPause} className="gap-2">
                <Pause className="h-4 w-4" />
                {isPaused ? "Resume" : "Pause"}
              </Button>
              <Button variant="outline" onClick={onReset} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {focusMinutes} min focus · {breakMinutes} min break · your timer only
        </p>
      </CardContent>
    </Card>
  );
}
