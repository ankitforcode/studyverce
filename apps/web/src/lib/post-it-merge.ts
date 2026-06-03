import type { UserPostItTask } from "@studyverce/shared";

/** Prefer locally edited tasks when a refetch returns older DB rows. */
export function mergeFetchedPostItTasks(
  local: UserPostItTask[],
  fetched: UserPostItTask[]
): UserPostItTask[] {
  const localById = new Map(local.map((t) => [t.id, t]));

  return fetched.map((remote) => {
    const kept = localById.get(remote.id);
    if (!kept) return remote;

    const localAt = Date.parse(kept.updatedAt) || 0;
    const remoteAt = Date.parse(remote.updatedAt) || 0;
    return localAt >= remoteAt ? kept : remote;
  });
}
