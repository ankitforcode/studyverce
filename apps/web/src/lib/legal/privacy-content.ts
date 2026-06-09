import { MUSIC_FREE_LINK_LIMIT, STUDY_ASSISTANT_FREE_DAILY_PROMPTS } from "@studyverce/shared";

export const PRIVACY_LAST_UPDATED = "June 9, 2026";

export const PRIVACY_CONTACT_EMAIL = "privacy@studyverce.com";

export type PrivacySection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export const privacySections: PrivacySection[] = [
  {
    id: "overview",
    title: "Overview",
    paragraphs: [
      "StudyVerce (“we”, “us”, or “our”) provides virtual study rooms with shared Pomodoro timers, chat, focus tracking, optional music, voice notes on eligible plans, and related study tools at studyverce.com and associated subdomains.",
      "This Privacy Policy explains what information we collect when you use StudyVerce, how we use it, and the choices you have. By creating an account or using the service, you agree to this policy.",
      "We offer Free, Premium, and Institution plan tiers. Feature limits differ by plan; see our Plans page and Terms of Service for details.",
    ],
  },
  {
    id: "information-we-collect",
    title: "Information we collect",
    paragraphs: ["We collect information you provide directly, information generated through your use of the product, and limited technical data needed to run the service."],
    bullets: [
      "Account data: email address, password (stored and hashed by our auth provider), and, if you use Google sign-in, basic profile details from Google (such as name and email for authentication).",
      "Profile data: username, display name, optional avatar, subject tags, plan tier, onboarding preferences, and public profile fields shown to other users.",
      "Study activity: focus minutes, study streaks, Pomodoro sessions, study goals, leaderboard standings, and dashboard analytics derived from your sessions (advanced analytics on Premium and Institution plans).",
      "Room activity: room membership, roles, chat messages you send, room settings you control, favorites, access requests, invite activity, and realtime presence status.",
      "Personal tasks: post-it notes and todo items you create in a room. These are private to your account and scoped to the room where you created them.",
      "Social features: friend requests, friendships, notifications, and related interactions with other users.",
      `Music: Free accounts may save up to ${MUSIC_FREE_LINK_LIMIT} pasted music links in My Links. Premium and Institution accounts may connect Spotify, YouTube Music, or Apple Music; we store OAuth tokens and provider metadata needed to control playback. We also store track metadata for links you add.`,
      "Voice notes (Premium and Institution): if you record a voice note, we store the audio file in our storage provider, optional transcript text, duration, and whether you shared it with the room. Shared voice notes can be replayed by room members you share with.",
      `AI study coach: messages you send to the in-room assistant are processed to generate replies. Free accounts are limited to ${STUDY_ASSISTANT_FREE_DAILY_PROMPTS} prompts per room per day without prior conversation context. Premium and Institution accounts may include conversation memory and room goal context.`,
      "Support and email: transactional emails such as sign-up confirmation, password reset, magic links, and room invitations.",
      "Technical data: IP address, browser type, device information, pages visited, and product usage events collected through cookies and similar technologies when permitted (see below).",
    ],
  },
  {
    id: "how-we-use",
    title: "How we use information",
    paragraphs: ["We use the information above to operate, secure, and improve StudyVerce."],
    bullets: [
      "Create and authenticate your account and keep you signed in.",
      "Provide study rooms, realtime chat, Pomodoro sync, presence indicators, and room listings.",
      "Enforce plan limits (participants, music links, AI prompts, and Premium-only features).",
      "Store your profile, tasks, focus stats, achievements, voice notes, and room preferences.",
      "Send invitations, security messages, and other service-related email.",
      "Power optional features such as streaming music controls, voice note transcription, and the AI study coach.",
      "Monitor reliability, prevent abuse, enforce rate limits, and protect the platform.",
      "Understand product usage through analytics (only with your consent where required) so we can improve the experience.",
    ],
  },
  {
    id: "sharing",
    title: "How we share information",
    paragraphs: [
      "We do not sell your personal information. We share data only as described below.",
    ],
    bullets: [
      "Other users: your username, display name, avatar, and activity visible in shared rooms (for example chat messages, shared voice notes, presence, and public profile pages). Post-it tasks and private voice notes you do not share remain visible only to you.",
      "Service providers that help us run StudyVerce, including Supabase (authentication, database, and file storage), hosting and infrastructure providers, Redis caching, email delivery, analytics (PostHog when configured, and Google Analytics when you consent), OpenAI for the AI study coach and optional speech-to-text transcription of voice notes.",
      "Music providers you choose to connect (Spotify, YouTube Music, or Apple Music) receive OAuth authorization requests according to their own policies.",
      "Legal and safety: when required by law, to respond to valid requests, or to protect users, our rights, and the security of the service.",
      "Business transfers: if StudyVerce is involved in a merger, acquisition, or asset sale, information may transfer as part of that transaction with notice where required.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies and similar technologies",
    paragraphs: [
      "We use cookies and local storage to keep you signed in, remember preferences, and measure product usage when you allow it.",
      "When you first visit StudyVerce, a cookie banner lets you accept all cookies, reject optional cookies, or customize analytics and marketing preferences. Your choice is stored in your browser and applied through Google Consent Mode v2.",
    ],
    bullets: [
      "Authentication cookies from Supabase to maintain your session.",
      "Short-lived OAuth state cookies when connecting a music provider.",
      "Browser session storage for AI coach conversation history in a room on Premium and Institution plans.",
      "A consent preference stored in local storage so we remember your cookie choices.",
      "Analytics cookies and events through PostHog when you allow analytics and NEXT_PUBLIC_POSTHOG_KEY is configured, including page views, Core Web Vitals (LCP, INP, CLS, FCP), page leave timing, session replays (with input fields and marked sensitive text masked; replays for signed-in users are linked to your account), and selected product events such as sign-in, sign-up, and room interactions.",
      "Analytics cookies and page-view measurement through Google Analytics (Google tag G-SSW5YJCT5M, or the ID configured for your environment) when you allow analytics, to understand traffic and how visitors use our public pages.",
      "Marketing cookies for ad measurement and personalization only when you allow marketing cookies (for example, if we run advertising campaigns in the future).",
    ],
  },
  {
    id: "retention",
    title: "Data retention",
    paragraphs: [
      "We keep your account and profile data while your account is active. Room messages, voice notes, study sessions, tasks, and related content are retained to provide the service and your history unless you delete them or your account.",
      "Voice note audio and transcripts remain until you delete the note or your account, subject to backup retention described below.",
      "Cached data in Redis (such as presence, listing, post-it drafts, or rate-limit counters) is temporary and expires automatically.",
      "We may retain limited logs and backups for security, troubleshooting, and legal compliance for a reasonable period.",
    ],
  },
  {
    id: "your-choices",
    title: "Your choices and rights",
    paragraphs: [
      "Depending on where you live, you may have rights to access, correct, delete, or export your personal information, or to object to certain processing.",
    ],
    bullets: [
      "Update your profile at Settings → Profile.",
      "Change your email or password at Settings → Account.",
      "Disconnect optional music integrations from room music settings.",
      "Delete your own voice notes from the room chat panel (Premium and Institution).",
      "Clear AI coach history by clearing site data or session storage for StudyVerce in your browser.",
      "Stop optional analytics or marketing cookies anytime using the Cookie settings link in the site footer.",
      "Reject optional cookies in the banner on first visit; essential sign-in cookies are required to use authenticated features.",
      "Contact us to request account deletion or other privacy requests. We will respond within a reasonable time.",
    ],
  },
  {
    id: "security",
    title: "Security",
    paragraphs: [
      "We use industry-standard measures including encrypted connections (HTTPS), row-level security in our database, access controls for administrative tools, and scoped storage policies for uploads such as wallpapers, music, and voice notes. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
    ],
  },
  {
    id: "children",
    title: "Children",
    paragraphs: [
      "StudyVerce is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has provided us personal information, contact us and we will take appropriate steps to delete it.",
    ],
  },
  {
    id: "international",
    title: "International users",
    paragraphs: [
      "StudyVerce is operated from the United States. Premium pricing is shown in EUR on our Plans page; payment processing terms will be shown at checkout when billing launches. If you access the service from other regions, your information may be processed in the United States and other countries where our service providers operate, which may have different data protection laws than your home country.",
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time. When we do, we will revise the “Last updated” date at the top of this page. Continued use of StudyVerce after changes become effective means you accept the updated policy.",
    ],
  },
  {
    id: "contact",
    title: "Contact us",
    paragraphs: [
      `Questions about this Privacy Policy or our data practices? Email us at ${PRIVACY_CONTACT_EMAIL}.`,
    ],
  },
];
