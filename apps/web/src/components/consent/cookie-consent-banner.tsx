"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Cookie, Settings2, Shield, X } from "lucide-react";
import type { ConsentPreferences } from "@/lib/consent/types";
import { PRIVACY_POLICY_PATH } from "@/lib/legal/urls";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CookieConsentBannerProps = {
  preferences: ConsentPreferences;
  onChange: (preferences: ConsentPreferences) => void;
  onAcceptAll: () => void;
  onRejectOptional: () => void;
  onSave: () => void;
  onClose: () => void;
};

const CATEGORIES = [
  {
    key: "necessary" as const,
    label: "Necessary",
    description: "Required for sign-in, security, and core site functionality.",
    locked: true,
  },
  {
    key: "analytics" as const,
    label: "Analytics",
    description: "Helps us understand traffic and improve StudyVerce (Google Analytics and PostHog).",
    locked: false,
  },
  {
    key: "marketing" as const,
    label: "Marketing",
    description: "Used for ad measurement and personalization if we run campaigns in the future.",
    locked: false,
  },
];

export function CookieConsentBanner({
  preferences,
  onChange,
  onAcceptAll,
  onRejectOptional,
  onSave,
  onClose,
}: CookieConsentBannerProps) {
  const [customizing, setCustomizing] = useState(false);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[300] p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-border/70 bg-card/95 p-5 shadow-2xl backdrop-blur-md sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Cookie className="h-5 w-5" />
            </div>
            <div>
              <h2 id="cookie-consent-title" className="text-base font-semibold sm:text-lg">
                Cookie preferences
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                We use cookies to keep you signed in and, with your permission, measure how
                StudyVerce is used. You can accept all, reject optional cookies, or customize
                your choices. See our{" "}
                <Link href={PRIVACY_POLICY_PATH} className="text-primary underline-offset-4 hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close cookie banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {customizing && (
          <div className="mt-5 space-y-3 border-t border-border/60 pt-5">
            {CATEGORIES.map((category) => {
              const enabled =
                category.key === "necessary" ? true : preferences[category.key];

              return (
                <div
                  key={category.key}
                  className="flex items-start justify-between gap-4 rounded-xl border border-border/50 bg-background/40 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {category.key === "necessary" ? (
                        <Shield className="h-4 w-4 text-primary" />
                      ) : (
                        <Settings2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      <p className="text-sm font-medium">{category.label}</p>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                  <ConsentToggle
                    checked={enabled}
                    disabled={category.locked}
                    label={`${category.label} cookies`}
                    onCheckedChange={(checked) => {
                      if (category.key === "necessary") return;
                      onChange({
                        ...preferences,
                        [category.key]: checked,
                      });
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setCustomizing((value) => !value)}
            className="text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {customizing ? "Hide details" : "Customize choices"}
          </button>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {customizing ? (
              <Button type="button" variant="outline" onClick={onSave} className="gap-2">
                <Check className="h-4 w-4" />
                Save preferences
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={onRejectOptional}>
                  Reject optional
                </Button>
                <Button type="button" onClick={onAcceptAll} className="gap-2">
                  <Check className="h-4 w-4" />
                  Accept all
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsentToggle({
  checked,
  disabled,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors",
        checked ? "border-primary bg-primary" : "border-border bg-muted",
        disabled && "cursor-not-allowed opacity-70"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}
