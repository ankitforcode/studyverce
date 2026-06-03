"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyRoomAppearance,
  clearRoomAppearance,
  getStoredRoomAppearance,
  storeRoomAppearance,
  type RoomAppearance,
} from "@/lib/room-appearance";

export function useRoomAppearance() {
  const [appearance, setAppearance] = useState<RoomAppearance>("dark");

  useEffect(() => {
    const stored = getStoredRoomAppearance();
    setAppearance(stored);
    applyRoomAppearance(stored);

    return () => {
      clearRoomAppearance();
    };
  }, []);

  const setRoomAppearance = useCallback((mode: RoomAppearance) => {
    setAppearance(mode);
    storeRoomAppearance(mode);
    applyRoomAppearance(mode);
  }, []);

  return { appearance, setRoomAppearance };
}
