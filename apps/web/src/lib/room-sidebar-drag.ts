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
