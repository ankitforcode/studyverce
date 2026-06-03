import type { UserPostItTask } from "@studyverce/shared";
import {
  getPostItsForRoom,
  getUserPostItTasks,
} from "@/app/dashboard/task-actions";

/** Room post-its via server action (Redis overlay + lazy DB flush). */
export async function fetchUserPostItTasks(): Promise<UserPostItTask[]> {
  return getUserPostItTasks();
}

export async function fetchPostItsForRoom(
  roomId: string
): Promise<UserPostItTask[]> {
  return getPostItsForRoom(roomId);
}

export async function fetchPostItForRoom(
  roomId: string
): Promise<UserPostItTask | null> {
  const tasks = await fetchPostItsForRoom(roomId);
  return tasks[0] ?? null;
}
