import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_ICONS, SITE_NAME, SITE_TAB_TITLE } from "@/lib/site-metadata";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TAB_TITLE,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#22c55e",
    lang: "en-US",
    categories: ["education", "productivity"],
    icons: [
      {
        src: SITE_ICONS.favicon,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: SITE_ICONS.apple,
        sizes: "180x180",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
