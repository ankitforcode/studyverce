import { getSiteUrl, SITE_NAME } from "@/lib/site-metadata";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export const SEO_HOME_CRUMB: BreadcrumbItem = {
  label: SITE_NAME,
  href: "/",
};

export const PUBLIC_BREADCRUMBS = {
  rooms: [
    SEO_HOME_CRUMB,
    { label: "Study Rooms", href: "/rooms" },
  ] as BreadcrumbItem[],
  plans: [
    SEO_HOME_CRUMB,
    { label: "Plans & Pricing", href: "/plans" },
  ] as BreadcrumbItem[],
  leaderboard: [
    SEO_HOME_CRUMB,
    { label: "Leaderboard", href: "/leaderboard" },
  ] as BreadcrumbItem[],
  privacy: [
    SEO_HOME_CRUMB,
    { label: "Privacy Policy", href: "/privacy" },
  ] as BreadcrumbItem[],
  terms: [
    SEO_HOME_CRUMB,
    { label: "Terms of Service", href: "/terms" },
  ] as BreadcrumbItem[],
} as const;

export function breadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      const entry: Record<string, unknown> = {
        "@type": "ListItem",
        position: index + 1,
        name: item.label,
      };

      if (item.href) {
        entry.item = `${siteUrl}${item.href}`;
      }

      return entry;
    }),
  };
}
