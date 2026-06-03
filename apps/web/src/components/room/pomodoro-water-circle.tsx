"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type TimerPhase = "idle" | "focus" | "break";

interface PomodoroWaterCircleProps {
  fillLevel: number;
  phase: TimerPhase;
  timeLabel: string;
  timeClassName?: string;
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
  { top: string; mid: string; bottom: string; ring: string }
> = {
  focus: {
    top: "#7dd3fc",
    mid: "#38bdf8",
    bottom: "#0369a1",
    ring: "rgba(56, 189, 248, 0.45)",
  },
  break: {
    top: "#fde68a",
    mid: "#fbbf24",
    bottom: "#b45309",
    ring: "rgba(251, 191, 36, 0.45)",
  },
};

export function PomodoroWaterCircle({
  fillLevel,
  phase,
  timeLabel,
  timeClassName,
  className,
}: PomodoroWaterCircleProps) {
  const clipId = useId();
  const gradId = useId();
  const [wavePhase, setWavePhase] = useState(0);
  const [displayLevel, setDisplayLevel] = useState(fillLevel);
  const rafRef = useRef(0);
  const targetLevelRef = useRef(fillLevel);
  const level = Math.max(0, Math.min(1, fillLevel));
  const activeTheme = phase !== "idle" ? WATER_THEMES[phase] : null;
  const surfaceY = CY + R - displayLevel * R * 2;

  useEffect(() => {
    targetLevelRef.current = level;
    if (phase === "idle") {
      setDisplayLevel(0);
    }
  }, [level, phase]);

  useEffect(() => {
    if (phase === "idle") {
      setWavePhase(0);
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
  }, [phase]);

  const wave1 = buildWavePath(surfaceY, wavePhase, 2.4, 28);
  const wave2 = buildWavePath(surfaceY + 0.8, wavePhase + Math.PI * 0.65, 1.6, 22);

  return (
    <div
      className={cn(
        "relative mx-auto aspect-square w-44 sm:w-48",
        className
      )}
    >
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="h-full w-full"
        aria-hidden
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx={CX} cy={CY} r={R} />
          </clipPath>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={activeTheme?.top ?? "#94a3b8"}
            />
            <stop
              offset="45%"
              stopColor={activeTheme?.mid ?? "#64748b"}
            />
            <stop
              offset="100%"
              stopColor={activeTheme?.bottom ?? "#475569"}
            />
          </linearGradient>
        </defs>

        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="var(--card)"
          fillOpacity={0.35}
        />
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-border/55"
        />

        <g clipPath={`url(#${clipId})`}>
          {level > 0.002 && (
            <>
              <path d={wave1} fill={`url(#${gradId})`} opacity={0.92} />
              <path d={wave2} fill={`url(#${gradId})`} opacity={0.55} />
            </>
          )}
        </g>

        {activeTheme && (
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={activeTheme.ring}
            strokeWidth="2.5"
          />
        )}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            "font-mono text-4xl font-bold tabular-nums leading-none tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:text-5xl",
            displayLevel > 0.35 ? "text-white" : "text-foreground",
            timeClassName
          )}
        >
          {timeLabel}
        </span>
      </div>
    </div>
  );
}
