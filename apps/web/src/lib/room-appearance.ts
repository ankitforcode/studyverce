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

export function applyRoomAppearance(mode: RoomAppearance) {
  document.documentElement.classList.toggle("light", mode === "light");
  document.documentElement.classList.toggle("dark", mode === "dark");
}

export function clearRoomAppearance() {
  document.documentElement.classList.remove("light");
  document.documentElement.classList.add("dark");
}
