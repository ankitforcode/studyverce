"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Copy, Gift, Sparkles, Users } from "lucide-react";
import type { PremiumSource } from "@studyverce/shared";
import type { ReferralsPageData } from "@/app/settings/referrals/actions";
import { UserBadgeStrip } from "@/components/profile/user-badge-strip";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const MILESTONE_STEPS = [
  { count: 3, label: "1 month Premium", rewardKey: "premium_1mo" },
  { count: 10, label: "Ambassador badge", rewardKey: "ambassador_badge" },
  { count: 25, label: "Lifetime Premium", rewardKey: "lifetime_premium" },
] as const;

function nextMilestone(qualifiedCount: number) {
  return MILESTONE_STEPS.find((step) => qualifiedCount < step.count) ?? null;
}

export function ReferralsPanel({ data }: { data: ReferralsPageData }) {
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  async function handleCopy() {
    startTransition(async () => {
      try {
        await navigator.clipboard.writeText(data.referralLink);
        setCopied(true);
        trackEvent("referral_link_copied", { referral_code: data.referralCode });
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopied(false);
      }
    });
  }

  const next = nextMilestone(data.qualifiedCount);
  const progressTarget = next?.count ?? data.milestones.lifetimePremium;
  const progressPct = Math.min(100, (data.qualifiedCount / progressTarget) * 100);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Invite friends, earn rewards
          </CardTitle>
          <CardDescription>
            Share your link. When a friend signs up and completes onboarding, you both get
            Premium perks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UserBadgeStrip
            planTier={data.planTier}
            premiumUntil={data.premiumUntil}
            premiumSource={data.premiumSource as PremiumSource}
            showPremiumDetail
          />

          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your referral link
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <code className="flex-1 truncate rounded-lg border border-border bg-background px-3 py-2 text-xs">
                {data.referralLink}
              </code>
              <Button type="button" variant="outline" onClick={handleCopy} className="shrink-0 gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {data.qualifiedCount} qualified invite{data.qualifiedCount === 1 ? "" : "s"}
              </span>
              {next ? (
                <span className="font-medium">
                  {data.qualifiedCount}/{next.count} to {next.label}
                </span>
              ) : (
                <span className="font-medium text-primary">All milestones unlocked</span>
              )}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <ul className="grid gap-2 sm:grid-cols-3">
            {MILESTONE_STEPS.map((step) => {
              const unlocked =
                data.qualifiedCount >= step.count ||
                data.rewardsGranted.includes(step.rewardKey);
              return (
                <li
                  key={step.count}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm",
                    unlocked ? "border-primary/30 bg-primary/5" : "border-border"
                  )}
                >
                  <p className="font-semibold">{step.count} friends</p>
                  <p className="text-xs text-muted-foreground">{step.label}</p>
                </li>
              );
            })}
          </ul>

          <p className="text-xs text-muted-foreground">
            Friends who join via your link get a 7-day Premium trial after they finish onboarding.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Your invites
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No invites yet. Copy your link and share it with study buddies.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.invites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {invite.refereeDisplayName ?? "Pending signup"}
                    </p>
                    {invite.refereeUsername && (
                      <p className="text-xs text-muted-foreground">@{invite.refereeUsername}</p>
                    )}
                  </div>
                  <Badge
                    variant={invite.status === "qualified" ? "accent" : "secondary"}
                  >
                    {invite.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Program terms are in our{" "}
        <Link href="/terms#referral-program" className="text-primary hover:underline">
          Terms of Service
        </Link>
        . Rewards may change; earned rewards are kept unless fraud is detected.
      </p>
    </div>
  );
}

export function ReferralProgressCard({ data }: { data: ReferralsPageData }) {
  const next = nextMilestone(data.qualifiedCount);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Invite friends
        </CardTitle>
        <CardDescription>
          {next
            ? `${data.qualifiedCount}/${next.count} qualified invites toward ${next.label}`
            : "You unlocked all referral milestones — keep sharing!"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/settings/referrals" className={buttonVariants({ size: "sm" })}>
          Share & earn rewards
        </Link>
      </CardContent>
    </Card>
  );
}
