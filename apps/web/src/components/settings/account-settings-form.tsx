"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/auth/password-input";
import { useNotifications } from "@/components/notifications/notification-provider";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { notificationMessages } from "@/lib/notifications/messages";
import { accountSettingsPath, reauthenticatePath } from "@/lib/auth/paths";

const POST_AUTH_REDIRECT_METADATA_KEY = "post_auth_redirect";

function needsReauthentication(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("reauthenticate") || lower.includes("re-auth");
}

interface AccountSettingsFormProps {
  currentEmail: string;
}

export function AccountSettingsForm({ currentEmail }: AccountSettingsFormProps) {
  const { toast } = useNotifications();
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [reauthLoading, setReauthLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [reauthSent, setReauthSent] = useState(false);

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setEmailLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });

    setEmailLoading(false);

    if (error) {
      if (needsReauthentication(error.message)) {
        setEmailError("Confirm your identity before changing your email.");
      } else {
        setEmailError(error.message);
      }
      return;
    }

    setNewEmail("");
    window.location.assign(accountSettingsPath("email_change=pending"));
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setPasswordLoading(false);

    if (error) {
      if (needsReauthentication(error.message)) {
        setPasswordError("Confirm your identity before changing your password.");
      } else {
        setPasswordError(error.message);
      }
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    toast(notificationMessages.passwordResetSuccess());
  }

  async function handleReauthenticate() {
    setReauthError(null);
    setReauthLoading(true);

    const supabase = createClient();
    const redirectPath = accountSettingsPath("reauth=success");

    const { error: metadataError } = await supabase.auth.updateUser({
      data: { [POST_AUTH_REDIRECT_METADATA_KEY]: redirectPath },
    });

    if (metadataError) {
      setReauthLoading(false);
      setReauthError(metadataError.message);
      return;
    }

    const { error } = await supabase.auth.reauthenticate();

    setReauthLoading(false);

    if (error) {
      setReauthError(error.message);
      return;
    }

    setReauthSent(true);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Verify identity
          </CardTitle>
          <CardDescription>
            Sensitive changes may require a fresh sign-in. We&apos;ll email you a secure
            confirmation link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reauthSent ? (
            <p className="text-sm text-muted-foreground">
              Check your inbox for a confirmation link. After verifying, return here to update
              your email or password.
            </p>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={reauthLoading}
              onClick={() => void handleReauthenticate()}
            >
              {reauthLoading ? "Sending email..." : "Email me a verification link"}
            </Button>
          )}
          {reauthError && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {reauthError}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Email address
          </CardTitle>
          <CardDescription>
            Current email: <span className="font-medium text-foreground">{currentEmail}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">New email</Label>
              <Input
                id="new-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>

            {emailError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {emailError}{" "}
                {needsReauthentication(emailError) && (
                  <Link
                    href={reauthenticatePath(accountSettingsPath())}
                    className="font-medium underline"
                  >
                    Verify identity
                  </Link>
                )}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={emailLoading}>
              {emailLoading ? "Saving..." : "Update email"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Choose a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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

            {passwordError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {passwordError}{" "}
                {needsReauthentication(passwordError) && (
                  <Link
                    href={reauthenticatePath(accountSettingsPath())}
                    className="font-medium underline"
                  >
                    Verify identity
                  </Link>
                )}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={passwordLoading}>
              {passwordLoading ? "Updating..." : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
