export type SidebarSlotLayout = {
  top: number;
  height: number;
};

/** Drop index from pointer Y using layout snapshot (ignores transform). */
export function getDropIndexFromLayout(
  clientY: number,
  containerTop: number,
  slots: SidebarSlotLayout[]
): number {
  if (slots.length === 0) return 0;

  const y = clientY - containerTop;

  for (let i = 0; i < slots.length; i++) {
    const { top, height } = slots[i];
    if (y < top + height / 2) return i;
  }

  return slots.length - 1;
}

/** Vertical shift (px) for non-dragged slots while reordering. */
export function getSidebarSlotShift(
  index: number,
  fromIndex: number,
  overIndex: number | null,
  draggedHeight: number
): number {
  if (overIndex === null || fromIndex === overIndex || draggedHeight <= 0) {
    return 0;
  }

  if (fromIndex < overIndex) {
    if (index > fromIndex && index <= overIndex) {
      return -draggedHeight;
    }
    return 0;
  }

  if (index >= overIndex && index < fromIndex) {
    return draggedHeight;
  }

  return 0;
}
