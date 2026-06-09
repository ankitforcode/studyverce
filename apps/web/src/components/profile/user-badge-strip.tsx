"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Clock,
  Crown,
  Flame,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import type { PlanTier, PremiumSource } from "@studyverce/shared";
import { isLifetimePremium, resolveEffectivePlanTier } from "@studyverce/shared";
import { PostItIconTooltip } from "@/components/dashboard/post-it-icon-tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type UserBadgeAchievement = {
  slug: string;
  name: string;
  icon?: string | null;
};

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  star: Star,
  flame: Flame,
  crown: Crown,
  clock: Clock,
  book: BookOpen,
  "users-star": Users,
};

type UserBadgeStripProps = {
  planTier: PlanTier;
  premiumUntil?: string | null;
  premiumSource?: PremiumSource;
  achievements?: UserBadgeAchievement[];
  showPremiumDetail?: boolean;
  compact?: boolean;
  /** Icon-only badges inline on a name row (room participant list). */
  layout?: "strip" | "inline";
  className?: string;
};

function achievementToneClass(slug: string) {
  return slug === "referrals_10"
    ? "bg-accent/20 text-accent"
    : "bg-primary/15 text-primary";
}

function AchievementIcon({ slug, icon }: { slug: string; icon?: string | null }) {
  const Icon = ACHIEVEMENT_ICONS[icon ?? ""] ?? Star;

  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded-full",
        achievementToneClass(slug)
      )}
      title={slug}
    >
      <Icon className="h-3 w-3" aria-hidden />
    </span>
  );
}

function InlineIconBadge({
  label,
  slug,
  icon,
  tone = "achievement",
  children,
}: {
  label: string;
  slug?: string;
  icon?: ReactNode;
  tone?: "premium" | "achievement";
  children?: ReactNode;
}) {
  return (
    <PostItIconTooltip label={label} side="top" align="center">
      <span
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          tone === "premium"
            ? "bg-accent/20 text-accent"
            : achievementToneClass(slug ?? "")
        )}
        aria-label={label}
      >
        {icon ?? children}
      </span>
    </PostItIconTooltip>
  );
}

function resolvePremiumLabel({
  effectiveTier,
  premiumSource,
  showPremiumDetail,
  premiumUntil,
  lifetime,
}: {
  effectiveTier: PlanTier;
  premiumSource: PremiumSource;
  showPremiumDetail: boolean;
  premiumUntil: string | null;
  lifetime: boolean;
}) {
  if (showPremiumDetail && premiumUntil && !lifetime) {
    return `Premium until ${new Date(premiumUntil).toLocaleDateString()}`;
  }

  if (effectiveTier === "institution") {
    return "Institution";
  }
  if (lifetime) {
    return "Lifetime Premium";
  }
  if (premiumSource === "referral_trial" && showPremiumDetail) {
    return "Premium trial";
  }
  return "Premium";
}

export function UserBadgeStrip({
  planTier,
  premiumUntil = null,
  premiumSource = "free",
  achievements = [],
  showPremiumDetail = false,
  compact = false,
  layout = "strip",
  className,
}: UserBadgeStripProps) {
  const effectiveTier = resolveEffectivePlanTier({
    planTier,
    premiumUntil,
    premiumSource,
  });
  const isPremium = effectiveTier === "premium" || effectiveTier === "institution";
  const lifetime = isLifetimePremium({ premiumSource });
  const premiumLabel = resolvePremiumLabel({
    effectiveTier,
    premiumSource,
    showPremiumDetail,
    premiumUntil,
    lifetime,
  });
  const highlightAchievements = achievements.filter((a) => a.slug === "referrals_10");
  const otherAchievements = achievements
    .filter((a) => a.slug !== "referrals_10")
    .slice(0, 3);

  if (layout === "inline") {
    return (
      <span className={cn("inline-flex shrink-0 items-center gap-1", className)}>
        {isPremium && (
          <InlineIconBadge label={premiumLabel} tone="premium">
            <Sparkles className="h-3 w-3" aria-hidden />
          </InlineIconBadge>
        )}
        {highlightAchievements.map((achievement) => {
          const Icon = ACHIEVEMENT_ICONS[achievement.icon ?? ""] ?? Star;
          return (
            <InlineIconBadge
              key={achievement.slug}
              label={achievement.name}
              slug={achievement.slug}
              icon={<Icon className="h-3 w-3" aria-hidden />}
            />
          );
        })}
        {!compact &&
          otherAchievements.map((achievement) => {
            const Icon = ACHIEVEMENT_ICONS[achievement.icon ?? ""] ?? Star;
            return (
              <InlineIconBadge
                key={achievement.slug}
                label={achievement.name}
                slug={achievement.slug}
                icon={<Icon className="h-3 w-3" aria-hidden />}
              />
            );
          })}
      </span>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {isPremium && (
        <Badge
          variant="accent"
          className={cn("gap-1", compact && "px-1.5 py-0 text-[10px]")}
          title={premiumLabel}
        >
          <Sparkles className={cn("shrink-0", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          {!compact && premiumLabel}
        </Badge>
      )}
      {highlightAchievements.map((achievement) => (
        <Badge
          key={achievement.slug}
          variant="secondary"
          className={cn("gap-1", compact && "px-1.5 py-0 text-[10px]")}
          title={achievement.name}
        >
          <AchievementIcon slug={achievement.slug} icon={achievement.icon} />
          {!compact && achievement.name}
        </Badge>
      ))}
      {!compact &&
        otherAchievements.map((achievement) => (
          <span
            key={achievement.slug}
            title={achievement.name}
            className="inline-flex"
          >
            <AchievementIcon slug={achievement.slug} icon={achievement.icon} />
          </span>
        ))}
    </div>
  );
}

export function AchievementListItem({
  slug,
  name,
  description,
  icon,
}: {
  slug: string;
  name: string;
  description: string;
  icon?: string | null;
}) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <AchievementIcon slug={slug} icon={icon} />
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
    </li>
  );
}
