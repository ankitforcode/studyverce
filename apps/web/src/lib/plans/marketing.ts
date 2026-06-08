import {
  FREE_MAX_ROOM_PARTICIPANTS,
  MUSIC_FREE_LINK_LIMIT,
  STUDY_ASSISTANT_FREE_DAILY_PROMPTS,
} from "@studyverce/shared";
import {
  formatPlanPriceEur,
  PREMIUM_MONTHLY_PRICE_EUR,
  PREMIUM_YEARLY_PRICE_EUR,
} from "@/lib/plans/pricing";

/** Short bullet-style summary of Free plan limits (marketing + legal). */
export const FREE_PLAN_LIMITS_SUMMARY =
  `Free accounts include public and private study rooms (1 private room), up to ${FREE_MAX_ROOM_PARTICIPANTS} participants per room, ${MUSIC_FREE_LINK_LIMIT} saved music links (paste supported URLs; delete a track to add another), ${STUDY_ASSISTANT_FREE_DAILY_PROMPTS} AI study coach prompts per room per day without conversation memory, and core Pomodoro, chat, post-it tasks, and focus dashboard features. Free accounts do not include Spotify/YouTube/Apple Music account linking, in-room video streaming, voice notes, team study rooms, or advanced analytics.`;

/** Premium capabilities currently marketed (billing may be pre-checkout). */
export const PREMIUM_PLAN_FEATURES_SUMMARY =
  "Premium and Institution plans add unlimited private rooms, team study rooms, up to 100 participants per room, unlimited saved music links, Spotify/YouTube/Apple Music integration, unlimited AI coach messages with conversation memory, in-room video streaming (rolling out), voice notes (record, share with the room, replay, and transcribe), and advanced focus analytics.";

export const PREMIUM_PRICING_SUMMARY = `Premium is priced at ${formatPlanPriceEur(PREMIUM_MONTHLY_PRICE_EUR)} per month (billed monthly) or ${formatPlanPriceEur(PREMIUM_YEARLY_PRICE_EUR)} per year (billed annually — two months free vs paying monthly). Paid checkout is not live yet; plan tiers may be assigned manually during early access.`;

export const SIGNUP_FREE_DISCLOSURE =
  "Free to join — virtual rooms, Pomodoro timers, chat, post-it tasks, and focus tracking included. Premium adds larger rooms, streaming music accounts, AI memory, voice notes, and more (see Plans).";

export const FOOTER_TAGLINE =
  "Free virtual study rooms with shared Pomodoro timers, study music, post-it tasks, and focus tracking — upgrade to Premium for team features, voice notes, and more.";

/** For homepage hero / about — accurate feature set. */
export const HOME_FREE_TIER_LINE =
  "Start free with live study rooms, shared timers, chat, and personal task notes. Compare Free and Premium limits anytime on our Plans page.";
