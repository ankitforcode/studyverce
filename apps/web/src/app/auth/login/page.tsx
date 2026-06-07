"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { trackEvent } from "@/lib/analytics";
import {
  forgotPasswordPath,
  onboardingPath,
  safeRedirectPath,
  signupPath,
} from "@/lib/auth/paths";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = safeRedirectPath(searchParams.get("redirect")) ?? "/dashboard";
  const authError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    authError === "auth" ? "Sign in failed. Please try again." : null
  );
  const [loading, setLoading] = useState(false);

  const isRoomRedirect = redirect.startsWith("/rooms/") && redirect !== "/rooms/new";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

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

    trackEvent("login_completed", { method: "email" });

    const userId = signInData.user?.id;
    const { data: profile } = userId
      ? await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", userId)
          .maybeSingle()
      : { data: null };

    const destination = profile?.onboarding_completed
      ? redirect
      : onboardingPath(redirect);
    router.push(destination);
    router.refresh();
  }

  async function handleGoogleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`,
      },
    });
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
      <form onSubmit={handleLogin} className="space-y-4">
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
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Password</Label>
            <Link
              href={forgotPasswordPath(redirect)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9"
              required
            />
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full shadow-md shadow-primary/20" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
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
