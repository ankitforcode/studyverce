"use server";

import { createRoom } from "@/app/rooms/actions";

export async function createRoomAction(
  _prevState: { error: string | null },
  formData: FormData
) {
  const focusMinutes = Number.parseInt(
    String(formData.get("focus_minutes") ?? "25"),
    10
  );
  const breakMinutes = Number.parseInt(
    String(formData.get("break_minutes") ?? "5"),
    10
  );

  const result = await createRoom({
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    is_public: formData.get("is_public") === "on",
    max_participants: Number.parseInt(
      String(formData.get("max_participants") ?? "50"),
      10
    ),
    settings: {
      pomodoroDefaults: {
        focusMinutes: Number.isFinite(focusMinutes) ? focusMinutes : 25,
        breakMinutes: Number.isFinite(breakMinutes) ? breakMinutes : 5,
      },
      breaksEnabled: formData.get("breaks_enabled") === "on",
    },
  });

  if (result?.error) {
    return { error: result.error };
  }

  return { error: null };
}
