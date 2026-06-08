"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { establishSessionFromUrl } from "@/lib/auth/establish-session";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { isRoomInvitePath, loginPath, safeRedirectPath } from "@/lib/auth/paths";
import {
  PASSWORD_SET_METADATA_KEY,
  POST_AUTH_REDIRECT_METADATA_KEY,
  FORCE_PASSWORD_CHANGE_METADATA_KEY,
} from "@/lib/auth/room-invite";

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [roomName, setRoomName] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const hasAuthParams =
        searchParams.has("code") ||
        searchParams.has("token_hash") ||
        typeof window !== "undefined" && window.location.hash.includes("access_token");

      if (hasAuthParams) {
        const { error: sessionError } = await establishSessionFromUrl(searchParams);
        if (sessionError) {
          setError(sessionError);
          setCheckingSession(false);
          return;
        }

        if (typeof window !== "undefined") {
          window.history.replaceState({}, "", window.location.pathname);
        }
      }

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setReady(!!session);

      if (session) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const name = user?.user_metadata?.room_name;
        setRoomName(typeof name === "string" ? name : null);
      }

      setCheckingSession(false);
    })();
  }, [searchParams]);

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
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: {
        [PASSWORD_SET_METADATA_KEY]: true,
        [FORCE_PASSWORD_CHANGE_METADATA_KEY]: false,
      },
    });

    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const redirectFromMetadata = user?.user_metadata?.[POST_AUTH_REDIRECT_METADATA_KEY];
    const redirect = safeRedirectPath(
      typeof redirectFromMetadata === "string" ? redirectFromMetadata : null
    );

    const destination =
      redirect && isRoomInvitePath(redirect) ? redirect : redirect ?? "/onboarding";

    window.location.assign(destination);
  }

  if (checkingSession) {
    return (
      <AuthPageShell title="Accept your invitation" description="Loading your invite session...">
        <p className="text-center text-sm text-muted-foreground">Please wait.</p>
      </AuthPageShell>
    );
  }

  if (!ready) {
    return (
      <AuthPageShell
        title="Invitation link expired"
        description="This invite link is invalid or has already been used."
      >
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Ask the room host to send you a new invite.
          </p>
          <Link href={loginPath("/rooms")}>
            <Button className="w-full">Back to sign in</Button>
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Create your password"
      description={
        roomName
          ? `Finish setting up your account to join ${roomName} on StudyVerce.`
          : "Finish setting up your StudyVerce account to accept your invitation."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
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
          {loading ? "Creating account..." : "Continue to room"}
        </Button>
      </form>
    </AuthPageShell>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  );
}
