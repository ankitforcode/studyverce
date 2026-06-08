import { HOME_FAQ } from "@/lib/seo/constants";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  getSiteUrl,
} from "@/lib/site-metadata";

type JsonLd = Record<string, unknown>;

function withContext(type: string, data: JsonLd): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": type,
    ...data,
  };
}

export function organizationJsonLd(): JsonLd {
  const siteUrl = getSiteUrl();

  return withContext("Organization", {
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/logo-email.png`,
    description: SITE_DESCRIPTION,
    email: "privacy@studyverce.com",
  });
}

export function websiteJsonLd(): JsonLd {
  const siteUrl = getSiteUrl();

  return withContext("WebSite", {
    name: SITE_NAME,
    url: siteUrl,
    description: SITE_DESCRIPTION,
    inLanguage: "en-US",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: siteUrl,
    },
  });
}

export function softwareApplicationJsonLd(): JsonLd {
  const siteUrl = getSiteUrl();

  return withContext("SoftwareApplication", {
    name: SITE_NAME,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description: SITE_DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: "Free plan with optional Premium subscription at €4.99/month",
    },
    featureList: [
      "Virtual study rooms",
      "Shared Pomodoro timer",
      "Room chat",
      "Personal post-it tasks",
      "Study music",
      "AI study coach",
      "Focus dashboard and leaderboard",
      "Premium voice notes and team features",
    ],
  });
}

export function faqPageJsonLd(): JsonLd {
  return withContext("FAQPage", {
    mainEntity: HOME_FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  });
}

export function webPageJsonLd(input: {
  path: string;
  name: string;
  description: string;
}): JsonLd {
  const siteUrl = getSiteUrl();

  return withContext("WebPage", {
    name: input.name,
    description: input.description,
    url: `${siteUrl}${input.path}`,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: siteUrl,
    },
  });
}

export const DEFAULT_JSON_LD = [
  organizationJsonLd(),
  websiteJsonLd(),
] as const;

export const HOME_JSON_LD = [
  softwareApplicationJsonLd(),
  faqPageJsonLd(),
  webPageJsonLd({
    path: "/",
    name: SITE_TITLE,
    description: SITE_DESCRIPTION,
  }),
] as const;
