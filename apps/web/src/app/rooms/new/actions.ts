"use server";

import { createRoom } from "@/app/rooms/actions";

export async function createRoomAction(
  _prevState: { error: string | null },
  formData: FormData
) {
  const result = await createRoom({
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    is_public: formData.get("is_public") === "on",
    max_participants: parseInt(formData.get("max_participants") as string) || 50,
  });

  if (result?.error) {
    return { error: result.error };
  }

  return { error: null };
}
