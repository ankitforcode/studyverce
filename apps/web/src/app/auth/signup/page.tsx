"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { trackEvent } from "@/lib/analytics";
import { loginPath, onboardingPath, safeRedirectPath } from "@/lib/auth/paths";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = safeRedirectPath(searchParams.get("redirect")) ?? "/onboarding";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRoomRedirect = redirect.startsWith("/rooms/") && redirect !== "/rooms/new";

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    trackEvent("signup_completed", { method: "email" });
    router.push(onboardingPath(redirect));
    router.refresh();
  }

  async function handleGoogleSignup() {
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
      title="Create your account"
      description={
        isRoomRedirect
          ? "Create an account to join this study room"
          : "Join StudyVerce and start studying together"
      }
    >
      <div className="mb-5 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-muted-foreground">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>Free to join — virtual rooms, Pomodoro timers, and study chat included.</span>
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
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9"
              minLength={6}
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
          {loading ? "Creating account..." : "Create account"}
        </Button>
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
