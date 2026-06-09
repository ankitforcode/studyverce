"use client";

import { useCallback, useEffect, useRef } from "react";
import type { PomodoroState } from "@studyverce/shared";
import type { AppSocket } from "@/hooks/use-socket";

function elapsedMinutes(state: PomodoroState): number {
  const totalSeconds =
    (state.phase === "break" ? state.breakMinutes : state.focusMinutes) * 60;
  const elapsed = totalSeconds - state.remainingSeconds;
  return Math.max(0, Math.floor(elapsed / 60));
}

function completedPhaseMinutes(state: PomodoroState): number {
  return state.phase === "break" ? state.breakMinutes : state.focusMinutes;
}

export function useStudySessionTracking({
  socket,
  connected,
  roomId,
  pomodoro,
  goalText,
  subjects,
}: {
  socket: AppSocket | null;
  connected: boolean;
  roomId: string;
  pomodoro: PomodoroState;
  goalText?: string;
  subjects?: string[];
}) {
  const sessionIdRef = useRef<string | null>(null);
  const startingSessionRef = useRef(false);
  const accumulatedFocusRef = useRef(0);
  const prevPomodoroRef = useRef(pomodoro);
  const pomodoroRef = useRef(pomodoro);
  const goalTextRef = useRef(goalText);
  const subjectsRef = useRef(subjects);

  pomodoroRef.current = pomodoro;
  goalTextRef.current = goalText;
  subjectsRef.current = subjects;

  const endSession = useCallback(
    (focusMinutes: number, breakMinutes: number) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId || !socket?.connected) return;

      socket.emit("session:end", {
        sessionId,
        focusMinutes,
        breakMinutes,
      });
      sessionIdRef.current = null;
      accumulatedFocusRef.current = 0;
    },
    [socket]
  );

  const startSession = useCallback(() => {
    if (!socket?.connected || sessionIdRef.current || startingSessionRef.current) return;

    startingSessionRef.current = true;
    socket.emit("session:start", {
      roomId,
      goalText: goalTextRef.current?.trim() || undefined,
      subjects:
        subjectsRef.current && subjectsRef.current.length > 0
          ? subjectsRef.current
          : undefined,
    });
  }, [socket, roomId]);

  useEffect(() => {
    if (!socket || !connected) return;

    const onStarted = ({ sessionId }: { sessionId: string }) => {
      startingSessionRef.current = false;
      sessionIdRef.current = sessionId;
    };

    socket.on("session:started", onStarted);
    return () => {
      socket.off("session:started", onStarted);
    };
  }, [socket, connected]);

  useEffect(() => {
    const prev = prevPomodoroRef.current;
    prevPomodoroRef.current = pomodoro;

    if (!socket || !connected) return;
    if (prev.phase === pomodoro.phase) return;

    if (prev.phase === "idle" && pomodoro.phase === "focus") {
      startSession();
      return;
    }

    if (prev.phase === "focus" && pomodoro.phase === "break") {
      accumulatedFocusRef.current += completedPhaseMinutes(prev);
      return;
    }

    if (prev.phase === "focus" && pomodoro.phase === "idle") {
      endSession(
        accumulatedFocusRef.current + elapsedMinutes(prev),
        0
      );
      return;
    }

    if (prev.phase === "break" && pomodoro.phase === "idle") {
      const breakMinutes =
        prev.remainingSeconds <= 0
          ? completedPhaseMinutes(prev)
          : elapsedMinutes(prev);
      endSession(accumulatedFocusRef.current, breakMinutes);
    }
  }, [pomodoro, socket, connected, startSession, endSession]);

  useEffect(() => {
    return () => {
      const state = pomodoroRef.current;
      const sessionId = sessionIdRef.current;
      if (!sessionId || !socket?.connected) return;

      if (state.phase === "focus") {
        socket.emit("session:end", {
          sessionId,
          focusMinutes: accumulatedFocusRef.current + elapsedMinutes(state),
          breakMinutes: 0,
        });
      } else if (state.phase === "break") {
        socket.emit("session:end", {
          sessionId,
          focusMinutes: accumulatedFocusRef.current,
          breakMinutes: elapsedMinutes(state),
        });
      } else {
        socket.emit("session:end", {
          sessionId,
          focusMinutes: 0,
          breakMinutes: 0,
        });
      }

      sessionIdRef.current = null;
      accumulatedFocusRef.current = 0;
    };
  }, [socket]);
}
