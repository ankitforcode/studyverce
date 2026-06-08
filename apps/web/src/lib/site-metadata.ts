import type { Metadata } from "next";

const DEFAULT_SITE_URL = "http://localhost:3001";

export const SITE_NAME = "StudyVerce";

export const SITE_TITLE =
  "StudyVerce — Virtual Study Rooms with Pomodoro Timer";

export const SITE_DESCRIPTION =
  "Join virtual study rooms with shared Pomodoro timers, lo-fi music, chat, and real-time accountability. Study together online — built for focus, like Discord for studying.";

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  return configured || DEFAULT_SITE_URL;
}

/** Canonical browser origin for OAuth/email redirects (prefer NEXT_PUBLIC_APP_URL). */
export function getAppOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return DEFAULT_SITE_URL;
}

export function createSiteMetadata(overrides?: Metadata): Metadata {
  const siteUrl = getSiteUrl();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: SITE_TITLE,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: [
      "StudyVerce",
      "virtual study room",
      "study together online",
      "pomodoro timer",
      "focus room",
      "study accountability",
      "group study",
      "lo-fi study music",
    ],
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    openGraph: {
      type: "website",
      locale: "en_US",
      url: siteUrl,
      siteName: SITE_NAME,
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
    },
    twitter: {
      card: "summary",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
    },
    robots: {
      index: true,
      follow: true,
    },
    ...overrides,
  };
}
