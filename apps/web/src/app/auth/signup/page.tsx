"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { PasswordInput } from "@/components/auth/password-input";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input, Label } from "@/components/ui/input";
import { trackEvent } from "@/lib/analytics";
import { syncPostHogUserFromSession } from "@/lib/consent/posthog-consent";
import { loginPath, onboardingPath, authCallbackUrl, safeRedirectPath } from "@/lib/auth/paths";
import { SIGNUP_FREE_DISCLOSURE } from "@/lib/plans/marketing";
import {
  PRIVACY_POLICY_PATH,
  TERMS_OF_SERVICE_PATH,
} from "@/lib/legal/urls";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = safeRedirectPath(searchParams.get("redirect")) ?? "/onboarding";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const isRoomRedirect = redirect.startsWith("/rooms/") && redirect !== "/rooms/new";

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: authCallbackUrl(redirect),
        data: { post_auth_redirect: redirect },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setConfirmationSent(true);
      setLoading(false);
      return;
    }

    await syncPostHogUserFromSession();
    trackEvent("signup_completed", { method: "email" });
    router.push(onboardingPath(redirect));
    router.refresh();
  }

  async function handleGoogleSignup() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authCallbackUrl(redirect),
      },
    });
  }

  return (
    <AuthPageShell
      title="Create your account"
      description={
        isRoomRedirect
          ? "Create an account to join this study room"
          : "Join StudyVerce and start studying together"
      }
    >
      {confirmationSent ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
            <Mail className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Check your email</p>
            <p className="text-sm text-muted-foreground">
              We sent a confirmation link to{" "}
              <span className="font-medium text-foreground">{email}</span>. Open it to finish
              creating your account.
            </p>
          </div>
          {process.env.NODE_ENV === "development" && (
            <p className="text-xs text-muted-foreground">
              Local dev: preview the message in{" "}
              <a
                href="http://localhost:54324"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                Inbucket
              </a>
              .
            </p>
          )}
          <Link
            href={loginPath(redirect)}
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
      <div className="mb-5 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-muted-foreground">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>{SIGNUP_FREE_DISCLOSURE}</span>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
              required
            />
          </div>
        </div>

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

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full shadow-md shadow-primary/20" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>

        <p className="text-center text-xs leading-5 text-muted-foreground">
          By creating an account, you agree to our{" "}
          <Link href={TERMS_OF_SERVICE_PATH} className="font-medium text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href={PRIVACY_POLICY_PATH} className="font-medium text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <div className="mt-5 space-y-4">
        <AuthDivider />
        <GoogleAuthButton onClick={handleGoogleSignup} />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={loginPath(redirect)} className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
        </>
      )}
    </AuthPageShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
