"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getStoredRoomAppearance,
  storeRoomAppearance,
  type RoomAppearance,
} from "@/lib/room-appearance";

export function useRoomAppearance() {
  const [appearance, setAppearance] = useState<RoomAppearance>("dark");

  useEffect(() => {
    setAppearance(getStoredRoomAppearance());
  }, []);

  const setRoomAppearance = useCallback((mode: RoomAppearance) => {
    setAppearance(mode);
    storeRoomAppearance(mode);
  }, []);

  return { appearance, setRoomAppearance };
}
