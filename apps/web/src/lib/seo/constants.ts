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

export const HOME_FAQ = [
  {
    question: "What is StudyVerce?",
    answer:
      "StudyVerce is an online platform for virtual study rooms. Join live focus sessions with shared Pomodoro timers, room chat, personal post-it tasks, optional study music, an in-room AI study coach, and a focus dashboard — start free and upgrade to Premium for team features, voice notes, and more.",
  },
  {
    question: "Is StudyVerce free to use?",
    answer:
      "Yes. Every account starts on the Free plan with public study rooms, Pomodoro timers, chat, post-it tasks, and focus tracking. Premium (€4.99/month or €49.90/year with two months free) adds larger rooms, unlimited AI with memory, music account linking, voice notes, and other power features when billing launches.",
  },
  {
    question: "How do virtual study rooms work?",
    answer:
      "Browse or create a room, sync a Pomodoro timer with others, chat for accountability, keep private post-it tasks on your desk, and optionally play study music. Room owners on Free can host up to 20 participants; Premium supports larger groups.",
  },
  {
    question: "Can I study with friends in a private room?",
    answer:
      "Yes. Free accounts can create one private room and invite friends by link or email. Premium unlocks unlimited private rooms and team collaboration features. Public rooms stay open for anyone looking for a live focus session.",
  },
  {
    question: "What is included on the Free plan?",
    answer: `Free includes core study room features with limits: ${FREE_MAX_ROOM_PARTICIPANTS} participants per room, ${MUSIC_FREE_LINK_LIMIT} saved music links, ${STUDY_ASSISTANT_FREE_DAILY_PROMPTS} AI coach prompts per room per day (no memory), and no Spotify/YouTube/Apple account linking, in-room video, or voice notes. See the Plans page for a full comparison.`,
  },
  {
    question: "How much does Premium cost?",
    answer: `Premium is ${formatPlanPriceEur(PREMIUM_MONTHLY_PRICE_EUR)} per month or ${formatPlanPriceEur(PREMIUM_YEARLY_PRICE_EUR)} per year (two months free). Stripe checkout is planned for a future release; until then you can use StudyVerce on Free at no cost.`,
  },
  {
    question: "Do you use cookies or analytics?",
    answer:
      "We use essential cookies to keep you signed in. Optional analytics (Google Analytics and PostHog) run only if you accept them in our cookie banner. You can change your choice anytime from Cookie settings in the footer.",
  },
] as const;

/** Primary and long-tail phrases for public landing pages (natural use in copy + metadata). */
export const SEO_KEYWORDS = [
  "StudyVerce",
  "virtual study room",
  "online study room",
  "study together online",
  "study with friends online",
  "pomodoro timer online",
  "shared pomodoro timer",
  "focus room",
  "study accountability",
  "group study app",
  "study room with music",
  "lo-fi study music",
  "remote study group",
  "college study room",
  "productivity for students",
  "study chat room",
  "discord for studying",
  "free study room app",
  "premium study room",
] as const;
