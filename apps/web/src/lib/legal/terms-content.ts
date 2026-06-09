import {
  FREE_PLAN_LIMITS_SUMMARY,
  PREMIUM_PLAN_FEATURES_SUMMARY,
  PREMIUM_PRICING_SUMMARY,
} from "@/lib/plans/marketing";
import { STUDY_ASSISTANT_FREE_DAILY_PROMPTS } from "@studyverce/shared";

export const TERMS_LAST_UPDATED = "June 9, 2026";

export const TERMS_CONTACT_EMAIL = "legal@studyverce.com";

export type TermsSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export const termsSections: TermsSection[] = [
  {
    id: "agreement",
    title: "Agreement to these terms",
    paragraphs: [
      "These Terms of Service (“Terms”) govern your access to and use of StudyVerce, including our website, virtual study rooms, Pomodoro timers, chat, personal post-it tasks, study music, optional voice notes, focus tracking, AI study coach, plans and pricing pages, and related features (collectively, the “Service”).",
      "By creating an account, signing in, or using the Service, you agree to these Terms and to our Privacy Policy. If you do not agree, do not use StudyVerce.",
    ],
  },
  {
    id: "eligibility",
    title: "Eligibility",
    paragraphs: [
      "You must be at least 13 years old to use StudyVerce. If you are under 18, you represent that you have permission from a parent or legal guardian.",
      "You may not use the Service if you are barred from doing so under applicable law or if we have previously suspended or terminated your account for a violation of these Terms.",
    ],
  },
  {
    id: "account",
    title: "Your account",
    paragraphs: [
      "You are responsible for the activity that occurs under your account and for keeping your login credentials secure. Use a strong password and notify us promptly if you suspect unauthorized access.",
    ],
    bullets: [
      "Provide accurate account information and keep your profile details up to date.",
      "You may sign in with email and password or, where available, Google OAuth.",
      "You may change your email or password in Settings → Account.",
      "Your account is assigned a plan tier (Free, Premium, or Institution) that controls certain feature limits described below.",
      "We may suspend or terminate accounts that violate these Terms or pose a risk to the Service or other users.",
    ],
  },
  {
    id: "service",
    title: "The Service",
    paragraphs: [
      "StudyVerce helps students study together online through shared rooms, realtime chat and presence, synchronized Pomodoro timers, personal post-it tasks, optional study music (pasted links or connected streaming accounts on eligible plans), optional voice notes on Premium and Institution plans, focus dashboards and leaderboards, friends and room invitations, and an optional in-room AI study coach.",
      "Features may change over time. Some capabilities are limited by plan tier. Unless your account is upgraded, new accounts start on the Free plan.",
      FREE_PLAN_LIMITS_SUMMARY,
      PREMIUM_PLAN_FEATURES_SUMMARY,
      "We strive to keep the Service available and reliable, but we do not guarantee uninterrupted or error-free operation. Maintenance, outages, or third-party failures may affect realtime features such as chat, presence, music playback, voice notes, or video streaming.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    paragraphs: [
      "StudyVerce is for study-related collaboration and focus. You agree not to misuse the Service or help others do so.",
    ],
    bullets: [
      "Do not harass, threaten, impersonate, or abuse other users in chat, voice notes, profiles, or room interactions.",
      "Do not post unlawful, infringing, deceptive, sexually explicit, hateful, or otherwise harmful content.",
      "Do not spam rooms, scrape the Service, attempt to bypass security, plan limits, or rate limits, or interfere with realtime systems.",
      "Do not use the AI study coach for off-topic, harmful, or academic-dishonesty requests (for example, cheating on exams). The coach is designed for study help only.",
      "Do not upload or share content you do not have the right to use, including copyrighted music or media unless you have permission.",
      "Do not record or share voice notes that violate others’ privacy or these Terms.",
      "Do not use the Service for commercial solicitation unrelated to legitimate study collaboration.",
      "Comply with the terms of any third-party services you connect, such as Google, Spotify, YouTube Music, or Apple Music.",
    ],
  },
  {
    id: "rooms-and-content",
    title: "Study rooms and your content",
    paragraphs: [
      "You may create or join public or private study rooms, send chat messages, record and share voice notes (on eligible plans), manage personal post-it tasks, customize room appearance, and invite others by link or email.",
      "You retain ownership of content you submit to the Service. To operate StudyVerce, you grant us a non-exclusive, worldwide, royalty-free license to host, store, display, transcribe (where you request transcription), and process your content solely as needed to provide and improve the Service.",
      "Room owners and moderators may manage membership in their rooms, including approving access requests and removing participants where the product provides those controls.",
      "Other users in a shared room can see information you choose to share there, such as your display name, avatar, chat messages, presence status, and voice notes you mark as shared with the room.",
      "Personal post-it tasks are visible only to you, even inside a shared room.",
    ],
  },
  {
    id: "third-party",
    title: "Third-party services",
    paragraphs: [
      "StudyVerce relies on third-party providers for authentication, database and file storage, analytics, email, AI responses, speech-to-text transcription, music streaming, and infrastructure. Your use of those integrations may be subject to separate terms and privacy policies.",
      "We are not responsible for third-party websites, apps, or content linked from the Service. Connecting a music provider is optional on eligible plans; you may disconnect it at any time through room music settings.",
    ],
  },
  {
    id: "billing",
    title: "Plans and billing",
    paragraphs: [
      "StudyVerce currently offers a Free tier with core study room features subject to the limits described above.",
      PREMIUM_PRICING_SUMMARY,
      "Institution plans may be offered separately for schools and organizations. Contact us for volume pricing.",
      "When paid subscriptions launch, pricing, billing cycles, taxes, and cancellation terms will be presented at checkout. Unless required by law, fees are non-refundable except as stated at checkout or in applicable law.",
      "We may change plan limits or pricing with reasonable notice where required. Continued use after a pricing change takes effect constitutes acceptance of the new terms for renewals.",
    ],
  },
  {
    id: "intellectual-property",
    title: "Intellectual property",
    paragraphs: [
      "StudyVerce and its branding, software, design, and built-in content (except user-submitted content) are owned by us or our licensors and are protected by intellectual property laws.",
      "You may not copy, modify, distribute, sell, or reverse engineer any part of the Service except as allowed by law or with our written permission.",
    ],
  },
  {
    id: "ai-coach",
    title: "AI study coach disclaimer",
    paragraphs: [
      "The AI study coach provides general study guidance and planning help in study rooms. It is not a substitute for teachers, tutors, licensed professionals, or official course materials.",
      `Free-plan accounts may send up to ${STUDY_ASSISTANT_FREE_DAILY_PROMPTS} coach prompts per room per day without prior conversation context or memory of earlier messages. Premium and Institution plans may include unlimited messages and conversation memory when those features are enabled for your account.`,
      "AI responses may be incomplete or inaccurate. You are responsible for verifying important information and for how you use suggestions in academic or professional settings.",
    ],
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    paragraphs: [
      "THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.",
      "We do not warrant that study outcomes, grades, focus metrics, transcripts, or leaderboard rankings will meet your expectations.",
      "In-room video streaming and some Premium features may be released gradually; availability can vary by account and region.",
    ],
  },
  {
    id: "referral-program",
    title: "Referral program",
    paragraphs: [
      "StudyVerce may offer a referral program that rewards users when new accounts sign up using a personal referral link and complete onboarding.",
      "Referral rewards may include time-limited Premium access, profile badges, or lifetime Premium entitlements as described in the product. Rewards have no cash value, are non-transferable, and may not be sold or exchanged.",
      "We may change referral milestones, reward types, or eligibility rules at any time. Changes apply prospectively; rewards already granted for qualified referrals are generally retained unless we detect fraud or abuse.",
      "We may withhold or revoke rewards if we reasonably believe you engaged in self-referrals, fake accounts, automated signups, or other manipulation. Our determination in good faith is final for program purposes.",
    ],
    bullets: [
      "A qualified referral typically requires a new user to sign up via your link and finish onboarding.",
      "Invited users may receive a promotional Premium trial after onboarding.",
      "Referral links and attribution may be stored using cookies and account metadata.",
    ],
  },
  {
    id: "liability",
    title: "Limitation of liability",
    paragraphs: [
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, STUDYVERCE AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND SUPPLIERS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING FROM YOUR USE OF THE SERVICE.",
      "OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE IS LIMITED TO THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE TWELVE MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM, OR (B) USD $100.",
      "Some jurisdictions do not allow certain limitations, so some of the above may not apply to you.",
    ],
  },
  {
    id: "termination",
    title: "Suspension and termination",
    paragraphs: [
      "You may stop using StudyVerce at any time. You may request account deletion by contacting us.",
      "We may suspend or terminate your access if you violate these Terms, create risk or legal exposure for us or other users, or if we discontinue the Service. Where reasonable, we will provide notice before termination.",
    ],
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    paragraphs: [
      "We may update these Terms from time to time. When we do, we will revise the “Last updated” date at the top of this page. Material changes may also be communicated through the Service or by email.",
      "Your continued use of StudyVerce after updated Terms take effect means you accept the revised Terms.",
    ],
  },
  {
    id: "governing-law",
    title: "Governing law",
    paragraphs: [
      "These Terms are governed by the laws of the United States and the State of Delaware, without regard to conflict-of-law principles, except where mandatory local law requires otherwise.",
      "Any dispute arising from these Terms or the Service will be resolved in the courts located in Delaware, unless applicable law requires a different venue.",
    ],
  },
  {
    id: "contact",
    title: "Contact us",
    paragraphs: [
      `Questions about these Terms? Email us at ${TERMS_CONTACT_EMAIL}. For privacy-related requests, see our Privacy Policy or contact privacy@studyverce.com.`,
    ],
  },
];
