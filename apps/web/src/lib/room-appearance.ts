export type RoomAppearance = "dark" | "light";

const STORAGE_KEY = "studyverce-room-appearance";

export function getStoredRoomAppearance(): RoomAppearance {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" ? "light" : "dark";
}

export function storeRoomAppearance(mode: RoomAppearance) {
  localStorage.setItem(STORAGE_KEY, mode);
}
