import {
  type PostItColor,
  type PostItItem,
  type UserPostItTask,
  POST_IT_COLORS,
} from "@studyverse/shared";

export type PostItTaskRow = {
  id: string;
  user_id: string;
  room_id: string | null;
  title: string;
  title_done: boolean;
  items: unknown;
  pos_x: number;
  pos_y: number;
  width?: number;
  height?: number;
  color: string;
  z_index: number;
  pinned?: boolean;
  closed?: boolean;
  created_at: string;
  updated_at: string;
};

export function mapPostItRow(row: PostItTaskRow): UserPostItTask {
  const items = Array.isArray(row.items) ? (row.items as PostItItem[]) : [];
  const color = POST_IT_COLORS.includes(row.color as PostItColor)
    ? (row.color as PostItColor)
    : "yellow";

  return {
    id: row.id,
    userId: row.user_id,
    roomId: row.room_id,
    title: row.title,
    titleDone: row.title_done,
    items,
    posX: Number(row.pos_x) || 40,
    posY: Number(row.pos_y) || 40,
    width: Number(row.width) || 200,
    height: Number(row.height) || 200,
    color,
    zIndex: Number(row.z_index) || 1,
    pinned: row.pinned ?? false,
    closed: row.closed ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
