"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/use-socket";

function parseRoomIds(roomIdsKey: string): string[] {
  if (!roomIdsKey) return [];
  return roomIdsKey.split(",").filter(Boolean);
}

export function useRoomListingPresence(roomIdsKey: string) {
  const { socket, connected } = useSocket();
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!roomIdsKey) return;

    let cancelled = false;

    async function fetchCounts() {
      try {
        const response = await fetch(
          `/presence?roomIds=${encodeURIComponent(roomIdsKey)}`
        );
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as { counts?: Record<string, number> };
        if (data.counts) {
          setCounts((prev) => ({ ...prev, ...data.counts }));
        }
      } catch {
        /* presence endpoint optional when socket server is down */
      }
    }

    void fetchCounts();

    if (connected) {
      return () => {
        cancelled = true;
      };
    }

    const interval = window.setInterval(() => {
      void fetchCounts();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [roomIdsKey, connected]);

  useEffect(() => {
    if (!socket || !connected || !roomIdsKey) return;

    const ids = parseRoomIds(roomIdsKey);
    if (ids.length === 0) return;

    socket.emit("rooms:presence:subscribe", { roomIds: ids });

    const onCount = ({ roomId, activeCount }: { roomId: string; activeCount: number }) => {
      setCounts((prev) => ({ ...prev, [roomId]: activeCount }));
    };

    const onSnapshot = ({ counts: snapshot }: { counts: Record<string, number> }) => {
      setCounts((prev) => ({ ...prev, ...snapshot }));
    };

    socket.on("rooms:presence-count", onCount);
    socket.on("rooms:presence-snapshot", onSnapshot);

    return () => {
      socket.emit("rooms:presence:unsubscribe", { roomIds: ids });
      socket.off("rooms:presence-count", onCount);
      socket.off("rooms:presence-snapshot", onSnapshot);
    };
  }, [socket, connected, roomIdsKey]);

  return counts;
}
