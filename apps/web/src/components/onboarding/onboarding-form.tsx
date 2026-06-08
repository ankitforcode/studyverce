"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SUBJECT_TAGS } from "@studyverce/shared";
import { createClient } from "@/lib/supabase/client";
import { safeRedirectPath } from "@/lib/auth/paths";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = safeRedirectPath(searchParams.get("redirect")) ?? "/dashboard";
  const isInviteRedirect = redirect.includes("/invite");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [subjectTags, setSubjectTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleTag(tag: string) {
    setSubjectTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 5 ? [...prev, tag] : prev
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username: username.toLowerCase(),
        display_name: displayName,
        subject_tags: subjectTags,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Set up your profile</CardTitle>
          <CardDescription>
            {isInviteRedirect
              ? "Finish your profile, then you can request access to the study room."
              : "Tell us a bit about yourself to personalize your experience"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="study_warrior"
                minLength={3}
                maxLength={30}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Subject tags (up to 5)</Label>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs border transition-colors",
                      subjectTags.includes(tag)
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {subjectTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {subjectTags.map((tag) => (
                    <Badge key={tag} variant="default">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Saving..."
                : isInviteRedirect
                  ? "Continue to room invite"
                  : "Complete setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
