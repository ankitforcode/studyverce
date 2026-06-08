"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { notificationMessages } from "@/lib/notifications/messages";
import { queuePendingToast } from "@/lib/notifications/pending-toast";
import { loginPath } from "@/lib/auth/paths";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setReady(!!session);
      setCheckingSession(false);
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    queuePendingToast(notificationMessages.passwordResetSuccess());
    // Full navigation so session cookies and middleware stay in sync (client router can stall here).
    window.location.assign("/dashboard");
  }

  if (checkingSession) {
    return (
      <AuthPageShell title="Set a new password" description="Loading your reset session...">
        <p className="text-center text-sm text-muted-foreground">Please wait.</p>
      </AuthPageShell>
    );
  }

  if (!ready) {
    return (
      <AuthPageShell
        title="Reset link expired"
        description="This password reset link is invalid or has already been used."
      >
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Request a new reset link from the sign-in page.
          </p>
          <Link href={loginPath("/dashboard")}>
            <Button className="w-full">Back to sign in</Button>
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Set a new password"
      description="Choose a strong password for your StudyVerce account."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full shadow-md shadow-primary/20" disabled={loading}>
          {loading ? "Updating password..." : "Update password"}
        </Button>
      </form>
    </AuthPageShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
