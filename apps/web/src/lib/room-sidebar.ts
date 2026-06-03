import {
  DEFAULT_ROOM_SIDEBAR_PANEL_ORDER,
  ROOM_SIDEBAR_PANEL_IDS,
  type RoomSidebarPanelId,
} from "@studyverce/shared";

export function normalizeSidebarPanelOrder(
  input: unknown
): RoomSidebarPanelId[] {
  if (!Array.isArray(input)) {
    return [...DEFAULT_ROOM_SIDEBAR_PANEL_ORDER];
  }

  const valid = input.filter((id): id is RoomSidebarPanelId =>
    ROOM_SIDEBAR_PANEL_IDS.includes(id as RoomSidebarPanelId)
  );
  const unique = [...new Set(valid)];

  if (unique.length !== ROOM_SIDEBAR_PANEL_IDS.length) {
    return [...DEFAULT_ROOM_SIDEBAR_PANEL_ORDER];
  }

  return unique;
}

export function reorderSidebarPanels(
  order: RoomSidebarPanelId[],
  fromIndex: number,
  toIndex: number
): RoomSidebarPanelId[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= order.length ||
    toIndex >= order.length
  ) {
    return order;
  }

  const next = [...order];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}
