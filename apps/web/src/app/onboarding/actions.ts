"use server";

import { revalidatePath } from "next/cache";
import { profileSchema } from "@studyverce/db";
import { createClient } from "@/lib/supabase/server";

export async function completeOnboarding(input: {
  username: string;
  displayName: string;
  subjectTags: string[];
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const parsed = profileSchema.safeParse({
    username: input.username.trim().toLowerCase(),
    display_name: input.displayName.trim(),
    subject_tags: input.subjectTags,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message;
    return { error: first ?? "Invalid profile data" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      username: parsed.data.username,
      display_name: parsed.data.display_name,
      subject_tags: parsed.data.subject_tags,
      onboarding_completed: true,
    })
    .eq("id", user.id)
    .select("username")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { error: "That username is already taken. Try another." };
    }
    return { error: error.message };
  }

  if (!data) {
    return { error: "Could not save your profile. Please try again." };
  }

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/profile");

  return { error: null };
}
