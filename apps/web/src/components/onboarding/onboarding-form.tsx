"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { SUBJECT_TAGS } from "@studyverce/shared";
import { completeOnboarding } from "@/app/onboarding/actions";
import { safeRedirectPath } from "@/lib/auth/paths";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { notifyNavbarProfileUpdated } from "@/lib/auth/navbar-profile-sync";
import { trackEvent } from "@/lib/analytics";

export function OnboardingForm({
  initialUsername = "",
  initialDisplayName = "",
}: {
  initialUsername?: string;
  initialDisplayName?: string;
}) {
  const searchParams = useSearchParams();
  const redirect = safeRedirectPath(searchParams.get("redirect")) ?? "/dashboard";
  const isInviteRedirect = redirect.includes("/invite");
  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialDisplayName);
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

    try {
      const result = await completeOnboarding({
        username,
        displayName,
        subjectTags,
      });

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      if (result.referralQualified) {
        trackEvent("referral_qualified");
      }

      const normalizedUsername = username.toLowerCase();
      notifyNavbarProfileUpdated({
        username: normalizedUsername,
        displayName,
      });

      window.location.assign(redirect);
    } catch {
      setError("Could not save your profile. Please try again.");
      setLoading(false);
    }
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
