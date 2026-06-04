"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type TimerPhase = "idle" | "focus" | "break";

interface PomodoroWaterCircleProps {
  fillLevel: number;
  phase: TimerPhase;
  timeLabel: string;
  timeClassName?: string;
  isPaused?: boolean;
  className?: string;
}

const VIEW = 100;
const CX = 50;
const CY = 50;
const R = 42;

function buildWavePath(
  surfaceY: number,
  phase: number,
  amplitude: number,
  wavelength: number
): string {
  const points: string[] = [`M -5 ${surfaceY}`];
  for (let x = -5; x <= VIEW + 5; x += 2) {
    const y =
      surfaceY +
      Math.sin((x / wavelength) * Math.PI * 2 + phase) * amplitude;
    points.push(`L ${x} ${y}`);
  }
  points.push(`L ${VIEW + 5} ${VIEW + 5} L -5 ${VIEW + 5} Z`);
  return points.join(" ");
}

const WATER_THEMES: Record<
  Exclude<TimerPhase, "idle">,
  { top: string; mid: string; bottom: string; ring: string; glow: string }
> = {
  focus: {
    top: "#7dd3fc",
    mid: "#38bdf8",
    bottom: "#0369a1",
    ring: "rgba(56, 189, 248, 0.55)",
    glow: "rgba(56, 189, 248, 0.2)",
  },
  break: {
    top: "#fde68a",
    mid: "#fbbf24",
    bottom: "#b45309",
    ring: "rgba(251, 191, 36, 0.55)",
    glow: "rgba(251, 191, 36, 0.18)",
  },
};

function TimerDigits({
  timeLabel,
  onWater,
  className,
}: {
  timeLabel: string;
  onWater: boolean;
  className?: string;
}) {
  const [mins = "00", secs = "00"] = timeLabel.split(":");

  return (
    <div
      className={cn(
        "flex items-baseline justify-center gap-1 tabular-nums",
        onWater ? "text-white" : "text-foreground",
        className
      )}
    >
      <span className="text-[2.75rem] font-bold leading-none tracking-tight sm:text-5xl">
        {mins}
      </span>
      <span
        className={cn(
          "pb-1 text-2xl font-light leading-none sm:text-3xl",
          onWater ? "text-white/70" : "text-muted-foreground/60"
        )}
      >
        :
      </span>
      <span className="text-[2.75rem] font-bold leading-none tracking-tight sm:text-5xl">
        {secs}
      </span>
    </div>
  );
}

export function PomodoroWaterCircle({
  fillLevel,
  phase,
  timeLabel,
  timeClassName,
  isPaused = false,
  className,
}: PomodoroWaterCircleProps) {
  const clipId = useId();
  const gradId = useId();
  const glossId = useId();
  const [wavePhase, setWavePhase] = useState(0);
  const [displayLevel, setDisplayLevel] = useState(fillLevel);
  const rafRef = useRef(0);
  const targetLevelRef = useRef(fillLevel);
  const level = Math.max(0, Math.min(1, fillLevel));
  const activeTheme = phase !== "idle" ? WATER_THEMES[phase] : null;
  const surfaceY = CY + R - displayLevel * R * 2;
  const onWater = displayLevel > 0.35;

  useEffect(() => {
    targetLevelRef.current = level;
    if (phase === "idle") {
      setDisplayLevel(0);
    }
  }, [level, phase]);

  useEffect(() => {
    if (phase === "idle" || isPaused) {
      if (phase === "idle") setWavePhase(0);
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) return;

    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      setWavePhase(((now - start) / 1000) * Math.PI * 1.4);
      setDisplayLevel((prev) => {
        const target = targetLevelRef.current;
        const delta = target - prev;
        if (Math.abs(delta) < 0.001) return target;
        return prev + delta * 0.14;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, isPaused]);

  const wave1 = buildWavePath(surfaceY, wavePhase, 2.4, 28);
  const wave2 = buildWavePath(surfaceY + 0.8, wavePhase + Math.PI * 0.65, 1.6, 22);

  return (
    <div
      className={cn(
        "relative mx-auto aspect-square w-[13.5rem] sm:w-[14.5rem]",
        className
      )}
    >
      {activeTheme && (
        <div
          className="pointer-events-none absolute inset-[-12%] rounded-full blur-2xl"
          style={{ background: activeTheme.glow }}
          aria-hidden
        />
      )}

      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className={cn(
          "relative h-full w-full drop-shadow-[0_8px_32px_rgba(0,0,0,0.35)]",
          isPaused && phase !== "idle" && "opacity-90"
        )}
        aria-hidden
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx={CX} cy={CY} r={R} />
          </clipPath>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={activeTheme?.top ?? "#94a3b8"} />
            <stop offset="45%" stopColor={activeTheme?.mid ?? "#64748b"} />
            <stop offset="100%" stopColor={activeTheme?.bottom ?? "#334155"} />
          </linearGradient>
          <linearGradient id={glossId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        <circle
          cx={CX}
          cy={CY}
          r={R + 1.5}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-border/25"
        />

        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="var(--card)"
          fillOpacity={phase === "idle" ? 0.55 : 0.4}
        />

        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={cn(
            phase === "idle" ? "text-border/70" : "text-border/40"
          )}
        />

        <g clipPath={`url(#${clipId})`}>
          {level > 0.002 && (
            <>
              <path d={wave1} fill={`url(#${gradId})`} opacity={0.94} />
              <path d={wave2} fill={`url(#${gradId})`} opacity={0.58} />
            </>
          )}
          <ellipse
            cx={CX}
            cy={CY - R * 0.55}
            rx={R * 0.72}
            ry={R * 0.38}
            fill={`url(#${glossId})`}
          />
        </g>

        {activeTheme && (
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={activeTheme.ring}
            strokeWidth="2"
          />
        )}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <TimerDigits
          timeLabel={timeLabel}
          onWater={onWater}
          className={cn(
            "drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]",
            !onWater && timeClassName
          )}
        />
      </div>

      {isPaused && phase !== "idle" && (
        <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
          Paused
        </span>
      )}
    </div>
  );
}
