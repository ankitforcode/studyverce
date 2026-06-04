"use client";

import { useCallback, useEffect, useState } from "react";
import type { PomodoroState } from "@studyverce/shared";
import { DEFAULT_ROOM_SETTINGS } from "@studyverce/shared";

function createDefaultState(focusMinutes: number, breakMinutes: number): PomodoroState {
  return {
    phase: "idle",
    remainingSeconds: focusMinutes * 60,
    focusMinutes,
    breakMinutes,
    startedBy: null,
    isPaused: false,
    updatedAt: new Date().toISOString(),
  };
}

function applyElapsed(state: PomodoroState): PomodoroState {
  if (state.phase === "idle" || state.isPaused) return state;

  const elapsed = Math.floor(
    (Date.now() - new Date(state.updatedAt).getTime()) / 1000
  );
  if (elapsed <= 0) return state;

  return {
    ...state,
    remainingSeconds: Math.max(0, state.remainingSeconds - elapsed),
    updatedAt: new Date().toISOString(),
  };
}

function advanceAfterZero(
  state: PomodoroState,
  breaksEnabled: boolean
): PomodoroState {
  if (state.remainingSeconds > 0) return state;

  if (state.phase === "focus") {
    if (!breaksEnabled) {
      return {
        ...createDefaultState(state.focusMinutes, state.breakMinutes),
        focusMinutes: state.focusMinutes,
        breakMinutes: state.breakMinutes,
      };
    }
    return {
      ...state,
      phase: "break",
      remainingSeconds: state.breakMinutes * 60,
      isPaused: false,
      updatedAt: new Date().toISOString(),
    };
  }

  if (state.phase === "break") {
    return {
      ...createDefaultState(state.focusMinutes, state.breakMinutes),
      focusMinutes: state.focusMinutes,
      breakMinutes: state.breakMinutes,
    };
  }

  return state;
}

function tickState(state: PomodoroState, breaksEnabled: boolean): PomodoroState {
  if (state.phase === "idle" || state.isPaused) return state;

  const next = {
    ...state,
    remainingSeconds: state.remainingSeconds - 1,
    updatedAt: new Date().toISOString(),
  };

  return advanceAfterZero(next, breaksEnabled);
}

function loadStoredState(
  storageKey: string,
  focusMinutes: number,
  breakMinutes: number,
  breaksEnabled: boolean
): PomodoroState | null {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PomodoroState;
    const merged: PomodoroState = {
      ...createDefaultState(focusMinutes, breakMinutes),
      ...parsed,
      focusMinutes,
      breakMinutes,
    };
    return applyElapsed(advanceAfterZero(merged, breaksEnabled));
  } catch {
    return null;
  }
}

export function useLocalPomodoro(
  roomId: string,
  userId: string,
  options?: {
    focusMinutes?: number;
    breakMinutes?: number;
    breaksEnabled?: boolean;
  }
) {
  const focusMinutes =
    options?.focusMinutes ?? DEFAULT_ROOM_SETTINGS.pomodoroDefaults.focusMinutes;
  const breakMinutes =
    options?.breakMinutes ?? DEFAULT_ROOM_SETTINGS.pomodoroDefaults.breakMinutes;
  const breaksEnabled =
    options?.breaksEnabled ?? DEFAULT_ROOM_SETTINGS.breaksEnabled;
  const storageKey = `studyverce-local-pomodoro:${userId}:${roomId}`;

  const [state, setState] = useState<PomodoroState>(() => {
    if (typeof window === "undefined") {
      return createDefaultState(focusMinutes, breakMinutes);
    }
    return (
      loadStoredState(storageKey, focusMinutes, breakMinutes, breaksEnabled) ??
      createDefaultState(focusMinutes, breakMinutes)
    );
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* quota / private mode */
    }
  }, [state, storageKey]);

  useEffect(() => {
    if (state.phase === "idle" || state.isPaused) return;

    const intervalId = window.setInterval(() => {
      setState((prev) => tickState(prev, breaksEnabled));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [state.phase, state.isPaused, breaksEnabled]);

  const start = useCallback(
    (phase: "focus" | "break") => {
      if (phase === "break" && !breaksEnabled) return;
      setState((prev) => {
        const focus = prev.focusMinutes;
        const breakM = prev.breakMinutes;
        return {
          phase,
          remainingSeconds: (phase === "focus" ? focus : breakM) * 60,
          focusMinutes: focus,
          breakMinutes: breakM,
          startedBy: userId,
          isPaused: false,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [userId, breaksEnabled]
  );

  const pause = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPaused: !prev.isPaused,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const reset = useCallback(() => {
    setState(createDefaultState(focusMinutes, breakMinutes));
  }, [focusMinutes, breakMinutes]);

  return { state, start, pause, reset };
}
