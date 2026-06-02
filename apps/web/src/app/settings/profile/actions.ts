"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfileSchema } from "@studyverse/db";

export async function updateProfile(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const parsed = updateProfileSchema.safeParse({
    username: formData.get("username"),
    display_name: formData.get("display_name"),
    subject_tags: formData.getAll("subject_tags"),
  });

  if (!parsed.success) {
    redirect("/settings/profile?error=invalid");
  }

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);

  if (error) {
    redirect("/settings/profile?error=save");
  }

  revalidatePath("/settings/profile");
  revalidatePath(`/profile/${parsed.data.username}`);
  redirect(`/profile/${parsed.data.username}`);
}
