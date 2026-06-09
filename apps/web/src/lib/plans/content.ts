import type { PlanTier } from "@studyverce/shared";
import { PLAN_LIMITS, STUDY_ASSISTANT_FREE_DAILY_PROMPTS } from "@studyverce/shared";
import {
  PREMIUM_PLAN_FEATURES_SUMMARY,
  PREMIUM_PRICING_SUMMARY,
} from "@/lib/plans/marketing";
import {
  formatPlanPriceEur,
  getPremiumPricing,
  PREMIUM_MONTHLY_PRICE_EUR,
  PREMIUM_YEARLY_MONTHS_CHARGED,
  PREMIUM_YEARLY_PRICE_EUR,
  type BillingInterval,
} from "@/lib/plans/pricing";

export type { BillingInterval };
export {
  formatPlanPriceEur,
  getPremiumPricing,
  PREMIUM_MONTHLY_PRICE_EUR,
  PREMIUM_YEARLY_MONTHS_CHARGED,
  PREMIUM_YEARLY_PRICE_EUR,
};

export type PlanFeature = {
  label: string;
  included: boolean;
  highlight?: boolean;
};

export type ProductPlan = {
  tier: PlanTier;
  name: string;
  headline: string;
  priceLabel: string;
  priceDetail: string;
  badge?: string;
  highlighted?: boolean;
  cta: {
    label: string;
    href: string;
    external?: boolean;
  };
  features: PlanFeature[];
};

const CORE_FEATURES: PlanFeature[] = [
  { label: "Public virtual study rooms", included: true },
  { label: "Shared Pomodoro timer", included: true },
  { label: "Room chat & presence", included: true },
  { label: "Personal post-it tasks", included: true },
  { label: "Study music & provider links", included: true },
  { label: "Focus dashboard & streaks", included: true },
  { label: "Leaderboard participation", included: true },
];

function privateRoomFeature(tier: PlanTier): PlanFeature {
  const limit = PLAN_LIMITS[tier].maxPrivateRooms;
  return {
    label:
      limit === Infinity
        ? "Unlimited private study rooms"
        : `${limit} private study room${limit === 1 ? "" : "s"}`,
    included: true,
    highlight: limit === Infinity,
  };
}

function teamFeature(tier: PlanTier): PlanFeature {
  return {
    label: "Team study rooms — invite members & collaborate privately",
    included: PLAN_LIMITS[tier].teamFeatures,
    highlight: PLAN_LIMITS[tier].teamFeatures,
  };
}

function aiFeature(tier: PlanTier): PlanFeature {
  const limits = PLAN_LIMITS[tier];

  if (limits.aiDailyPromptsPerRoom !== null) {
    return {
      label: `AI study coach — ${limits.aiDailyPromptsPerRoom} prompts/day per room (no memory)`,
      included: true,
    };
  }

  return {
    label: "AI study coach — unlimited messages with conversation memory",
    included: true,
    highlight: true,
  };
}

function analyticsFeature(tier: PlanTier): PlanFeature {
  return {
    label: "Advanced focus analytics",
    included: PLAN_LIMITS[tier].advancedAnalytics,
  };
}

function musicLinksFeature(tier: PlanTier): PlanFeature {
  const limit = PLAN_LIMITS[tier].maxUserMusicLinks;
  return {
    label:
      limit === null
        ? "Unlimited saved music links"
        : `${limit} saved music links (delete to add more)`,
    included: true,
    highlight: limit === null,
  };
}

function streamingIntegrationFeature(tier: PlanTier): PlanFeature {
  return {
    label: "Spotify, YouTube Music & Apple Music integration",
    included: PLAN_LIMITS[tier].streamingIntegration,
    highlight: PLAN_LIMITS[tier].streamingIntegration,
  };
}

function participantsFeature(tier: PlanTier): PlanFeature {
  const limit = PLAN_LIMITS[tier].maxRoomParticipants;
  return {
    label:
      limit === null
        ? "Up to 100 participants per room"
        : `Up to ${limit} participants per room`,
    included: true,
  };
}

function roomVideoFeature(tier: PlanTier): PlanFeature {
  return {
    label: "In-room video streaming",
    included: PLAN_LIMITS[tier].roomVideo,
    highlight: PLAN_LIMITS[tier].roomVideo,
  };
}

function voiceNotesFeature(tier: PlanTier): PlanFeature {
  return {
    label: "Voice notes — share, replay & transcribe with the group",
    included: PLAN_LIMITS[tier].voiceNotes,
    highlight: PLAN_LIMITS[tier].voiceNotes,
  };
}

function magicLinkFeature(tier: PlanTier): PlanFeature {
  return {
    label: "Passwordless magic link sign-in",
    included: PLAN_LIMITS[tier].magicLinkLogin,
    highlight: PLAN_LIMITS[tier].magicLinkLogin,
  };
}

export const PRODUCT_PLANS: ProductPlan[] = [
  {
    tier: "free",
    name: "Free",
    headline: "Everything you need to study together online.",
    priceLabel: "€0",
    priceDetail: "Free forever",
    badge: "Current default",
    cta: {
      label: "Get started free",
      href: "/auth/signup",
    },
    features: [
      ...CORE_FEATURES,
      privateRoomFeature("free"),
      musicLinksFeature("free"),
      streamingIntegrationFeature("free"),
      participantsFeature("free"),
      roomVideoFeature("free"),
      voiceNotesFeature("free"),
      aiFeature("free"),
      teamFeature("free"),
      analyticsFeature("free"),
      magicLinkFeature("free"),
    ],
  },
  {
    tier: "premium",
    name: "Premium",
    headline: "Team collaboration, unlimited AI, and power features.",
    priceLabel: formatPlanPriceEur(PREMIUM_MONTHLY_PRICE_EUR),
    priceDetail: "per month, billed monthly",
    highlighted: true,
    badge: "Most popular",
    cta: {
      label: "Upgrade to Premium",
      href: "/auth/signup",
    },
    features: [
      ...CORE_FEATURES,
      privateRoomFeature("premium"),
      teamFeature("premium"),
      musicLinksFeature("premium"),
      streamingIntegrationFeature("premium"),
      participantsFeature("premium"),
      roomVideoFeature("premium"),
      voiceNotesFeature("premium"),
      aiFeature("premium"),
      analyticsFeature("premium"),
      magicLinkFeature("premium"),
      { label: "Priority access to new features", included: true },
    ],
  },
  {
    tier: "institution",
    name: "Institution",
    headline: "For schools, tutoring centers, and study groups at scale.",
    priceLabel: "Custom",
    priceDetail: "Volume pricing for teams",
    cta: {
      label: "Contact sales",
      href: "mailto:legal@studyverce.com?subject=StudyVerce%20Institution%20plan",
      external: true,
    },
    features: [
      ...CORE_FEATURES,
      privateRoomFeature("institution"),
      teamFeature("institution"),
      musicLinksFeature("institution"),
      streamingIntegrationFeature("institution"),
      participantsFeature("institution"),
      roomVideoFeature("institution"),
      voiceNotesFeature("institution"),
      aiFeature("institution"),
      analyticsFeature("institution"),
      magicLinkFeature("institution"),
      { label: "Admin-managed accounts (roadmap)", included: true },
      { label: "Dedicated onboarding support", included: true },
    ],
  },
];

export const PLAN_FAQ = [
  {
    question: "Is StudyVerce free right now?",
    answer:
      "Yes. Every new account starts on the Free plan with public study rooms, Pomodoro timers, chat, music, and focus tracking. The AI study coach is included with a limit of 10 prompts per room per day and no conversation memory.",
  },
  {
    question: "What does Premium unlock?",
    answer: PREMIUM_PLAN_FEATURES_SUMMARY,
  },
  {
    question: "How much does Premium cost?",
    answer: `${PREMIUM_PRICING_SUMMARY} You can compare monthly and yearly pricing using the toggle on this page.`,
  },
  {
    question: "How many people can join a Free room?",
    answer:
      "Rooms owned by Free accounts can have up to 20 participants (including the owner). Premium and Institution plans support larger study groups — up to 100 per room setting.",
  },
  {
    question: "Can I use video or voice notes on Free?",
    answer:
      "No. In-room video streaming and voice notes (record, share with the room, replay, and transcribe) are Premium and Institution features.",
  },
  {
    question: "How many music links can I save on Free?",
    answer:
      "Free accounts can save up to 10 music links in My Links (paste link or imports). Delete an existing track before adding a new one. Premium and Institution plans include unlimited saved links.",
  },
  {
    question: "Can I connect Spotify or YouTube Music on Free?",
    answer:
      "No. Account integration for Spotify, YouTube Music, and Apple Music is available on Premium and Institution plans. Free users can still paste supported URLs from the Paste link tab within the 10-link limit.",
  },
  {
    question: "How does the Free AI study coach work?",
    answer: `Free accounts can send up to ${STUDY_ASSISTANT_FREE_DAILY_PROMPTS} assistant prompts per room per day. Each message is handled on its own — the coach does not remember earlier messages or your post-it goals. Premium and Institution plans remove that limit and enable memory.`,
  },
  {
    question: "When will Premium billing be available?",
    answer:
      "Stripe subscriptions are planned for a future release. You can compare monthly and yearly Premium pricing on this page; final checkout terms, taxes, and cancellation options will be shown before you purchase. Until then, you can use StudyVerce on the Free plan at no cost.",
  },
  {
    question: "Can schools or tutoring businesses get a custom plan?",
    answer:
      "Yes. Email legal@studyverce.com with your organization size and use case. We will share Institution pricing and onboarding options when available.",
  },
] as const;
