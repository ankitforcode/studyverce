"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { accountSettingsPath, safeRedirectPath } from "@/lib/auth/paths";

const POST_AUTH_REDIRECT_METADATA_KEY = "post_auth_redirect";

function ReauthenticateForm() {
  const searchParams = useSearchParams();
  const redirect = safeRedirectPath(searchParams.get("redirect")) ?? accountSettingsPath("reauth=success");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: metadataError } = await supabase.auth.updateUser({
      data: { [POST_AUTH_REDIRECT_METADATA_KEY]: redirect },
    });

    if (metadataError) {
      setLoading(false);
      setError(metadataError.message);
      return;
    }

    const { error: reauthError } = await supabase.auth.reauthenticate();

    setLoading(false);

    if (reauthError) {
      setError(reauthError.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <AuthPageShell
        title="Check your email"
        description="We sent a secure link to confirm it's you."
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Open the link in your inbox, then return to your account settings to finish.
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
          <Link href={redirect}>
            <Button variant="outline" className="w-full">
              Back to settings
            </Button>
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Confirm it's you"
      description="For your security, verify your identity before continuing."
    >
      <div className="space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          We&apos;ll email you a one-time link. After you confirm, you can change your email or
          password.
        </p>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          type="button"
          className="w-full shadow-md shadow-primary/20"
          disabled={loading}
          onClick={() => void handleSend()}
        >
          {loading ? "Sending..." : "Send verification email"}
        </Button>

        <Link href={redirect}>
          <Button variant="ghost" className="w-full">
            Cancel
          </Button>
        </Link>
      </div>
    </AuthPageShell>
  );
}

export default function ReauthenticatePage() {
  return (
    <Suspense>
      <ReauthenticateForm />
    </Suspense>
  );
}
