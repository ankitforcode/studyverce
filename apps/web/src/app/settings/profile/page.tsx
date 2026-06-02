import { redirect } from "next/navigation";
import { SUBJECT_TAGS } from "@studyverse/shared";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "@/app/settings/profile/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>Update your public profile information</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                defaultValue={profile.username}
                required
                minLength={3}
                maxLength={30}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Display name</Label>
              <Input
                id="display_name"
                name="display_name"
                defaultValue={profile.display_name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Subject tags</Label>
              <div className="grid grid-cols-2 gap-2">
                {SUBJECT_TAGS.map((tag) => (
                  <label key={tag} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="subject_tags"
                      value={tag}
                      defaultChecked={profile.subject_tags.includes(tag)}
                      className="rounded"
                    />
                    {tag}
                  </label>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full">
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
