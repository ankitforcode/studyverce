"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendMagicLinkLogin } from "@/app/auth/actions";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { trackEvent } from "@/lib/analytics";
import { syncPostHogUserFromSession } from "@/lib/consent/posthog-consent";
import {
  authCallbackUrl,
  forgotPasswordPath,
  resolvePostAuthDestination,
  safeRedirectPath,
  signupPath,
} from "@/lib/auth/paths";

type LoginMode = "password" | "magic_link";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = safeRedirectPath(searchParams.get("redirect")) ?? "/dashboard";
  const authError = searchParams.get("error");
  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    authError === "auth" ? "Sign in failed. Please try again." : null
  );
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const isRoomRedirect = redirect.startsWith("/rooms/") && redirect !== "/rooms/new";

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      let onboardingCompleted = false;
      const userId = signInData.user?.id;
      if (userId) {
        try {
          const profileResult = await Promise.race([
            supabase
              .from("profiles")
              .select("onboarding_completed")
              .eq("id", userId)
              .maybeSingle(),
            new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 2000)),
          ]);
          if (profileResult && "data" in profileResult) {
            onboardingCompleted = profileResult.data?.onboarding_completed ?? false;
          }
        } catch {
          // Server routes (/onboarding, invite) still enforce profile setup when needed.
        }
      }

      await syncPostHogUserFromSession();
      trackEvent("login_completed", { method: "email" });
      const destination = resolvePostAuthDestination(redirect, onboardingCompleted);
      window.location.assign(destination);
    } catch {
      setError("Sign in failed. Please try again.");
      setLoading(false);
    }
  }

  async function handleMagicLinkLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await sendMagicLinkLogin(email, redirect);

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    trackEvent("login_magic_link_sent", { redirect });
    setMagicLinkSent(true);
  }

  async function handleGoogleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authCallbackUrl(redirect),
      },
    });
  }

  if (magicLinkSent) {
    return (
      <AuthPageShell
        title="Check your email"
        description="If an account exists for this email, we sent a sign-in link."
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Check the inbox for{" "}
            <span className="font-medium text-foreground">{email}</span> and open the link if you
            receive one.
          </p>
          {process.env.NODE_ENV === "development" && (
            <p className="text-xs text-muted-foreground">
              Local dev: preview in{" "}
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
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setMagicLinkSent(false);
              setMode("password");
            }}
          >
            Back to sign in
          </Button>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Welcome back"
      description={
        isRoomRedirect
          ? "Sign in to join this study room"
          : "Sign in to continue studying together"
      }
    >
      <div className="mb-4 flex rounded-lg border border-border/60 bg-muted/30 p-1">
        <button
          type="button"
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "password"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => {
            setMode("password");
            setError(null);
          }}
        >
          Password
        </button>
        <button
          type="button"
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "magic_link"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => {
            setMode("magic_link");
            setError(null);
          }}
        >
          Magic link
          <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden />
        </button>
      </div>

      <form
        onSubmit={mode === "password" ? handlePasswordLogin : handleMagicLinkLogin}
        className="space-y-4"
      >
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

        {mode === "password" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <Link
                href={forgotPasswordPath(redirect)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        )}

        {mode === "magic_link" && (
          <p className="text-sm text-muted-foreground">
            Premium feature — we&apos;ll email you a one-time link, no password needed.
          </p>
        )}

        {error && (
          <div className="space-y-2">
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
            {error.includes("Premium") && (
              <p className="text-sm text-muted-foreground">
                <Link href="/plans" className="font-medium text-primary hover:underline">
                  View Premium plans
                </Link>
              </p>
            )}
          </div>
        )}

        <Button type="submit" className="w-full shadow-md shadow-primary/20" disabled={loading}>
          {loading
            ? mode === "password"
              ? "Signing in..."
              : "Sending link..."
            : mode === "password"
              ? "Sign in"
              : "Email me a sign-in link"}
        </Button>
      </form>

      <div className="mt-5 space-y-4">
        <AuthDivider />
        <GoogleAuthButton onClick={handleGoogleLogin} />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href={signupPath(redirect)} className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </AuthPageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
