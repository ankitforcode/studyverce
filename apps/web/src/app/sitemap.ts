import type { MetadataRoute } from "next";
import {
  PRIVACY_POLICY_PATH,
  TERMS_OF_SERVICE_PATH,
} from "@/lib/legal/urls";
import { getSiteUrl } from "@/lib/site-metadata";

const PUBLIC_PATHS = [
  { path: "", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/rooms", changeFrequency: "daily" as const, priority: 0.9 },
  { path: "/leaderboard", changeFrequency: "daily" as const, priority: 0.8 },
  { path: PRIVACY_POLICY_PATH, changeFrequency: "monthly" as const, priority: 0.5 },
  { path: TERMS_OF_SERVICE_PATH, changeFrequency: "monthly" as const, priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return PUBLIC_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
