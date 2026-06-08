import type { Metadata } from "next";
import { SEO_KEYWORDS } from "@/lib/seo/constants";

const DEFAULT_SITE_URL = "http://localhost:3001";

export const SITE_NAME = "StudyVerce";

export const SITE_TITLE =
  "Free Virtual Study Rooms — Pomodoro Timer & Study Together Online";

export const SITE_DESCRIPTION =
  "Join free virtual study rooms with shared Pomodoro timers, post-it tasks, study music, and live chat. Upgrade to Premium for team rooms, voice notes, and unlimited AI — study together online.";

export const OG_IMAGE_PATH = "/opengraph-image";

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

/** Origin for post-auth redirects from `/auth/callback` (Amplify / load-balancer aware). */
export function resolveAuthRedirectOrigin(request: Request): string {
  const { origin } = new URL(request.url);
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");

  if (process.env.NODE_ENV === "development") {
    return origin;
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const forwardedProto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (configured) return configured;
  return origin;
}

export const NOINDEX_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
};

export const INDEX_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

export type SiteMetadataOptions = Metadata & {
  /** App path for canonical + Open Graph URL, e.g. `/rooms`. Omit for site root. */
  path?: string;
};

function resolveTitle(title: Metadata["title"], fallback: string): string {
  if (!title) return fallback;
  if (typeof title === "string") return title;
  if ("absolute" in title && title.absolute) return title.absolute;
  if ("default" in title && title.default) return title.default;
  return fallback;
}

function resolveDescription(
  description: Metadata["description"],
  fallback: string
): string {
  return typeof description === "string" && description.length > 0
    ? description
    : fallback;
}

export function createSiteMetadata(overrides?: SiteMetadataOptions): Metadata {
  const siteUrl = getSiteUrl();
  const path = overrides?.path ?? "";
  const canonicalUrl = `${siteUrl}${path}`;

  const {
    path: _path,
    openGraph: openGraphOverrides,
    twitter: twitterOverrides,
    alternates: alternatesOverrides,
    robots: robotsOverrides,
    title: titleOverride,
    description: descriptionOverride,
    ...restOverrides
  } = overrides ?? {};

  const title = resolveTitle(titleOverride, SITE_TITLE);
  const description = resolveDescription(descriptionOverride, SITE_DESCRIPTION);

  const openGraph: NonNullable<Metadata["openGraph"]> = {
    type: "website",
    locale: "en_US",
    url: canonicalUrl,
    siteName: SITE_NAME,
    title,
    description,
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: SITE_TITLE,
      },
    ],
    ...openGraphOverrides,
  };

  const twitter: NonNullable<Metadata["twitter"]> = {
    card: "summary_large_image",
    title,
    description,
    images: [OG_IMAGE_PATH],
    ...twitterOverrides,
  };

  return {
    metadataBase: new URL(siteUrl),
    title: titleOverride ?? {
      default: SITE_TITLE,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    applicationName: SITE_NAME,
    category: "education",
    keywords: [...SEO_KEYWORDS],
    authors: [{ name: SITE_NAME, url: siteUrl }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? {
          verification: {
            google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
          },
        }
      : {}),
    openGraph,
    twitter,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-US": canonicalUrl,
      },
      ...alternatesOverrides,
    },
    robots: robotsOverrides ?? INDEX_ROBOTS,
    ...restOverrides,
  };
}
