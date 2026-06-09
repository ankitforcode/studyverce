"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";

/** Active study room page (`/rooms/:slug`), not listing, create, or invite flows. */
export function isStudyRoomShellPath(pathname: string): boolean {
  return /^\/rooms\/(?!new$)[^/]+$/.test(pathname);
}

export function ConditionalSiteFooter() {
  const pathname = usePathname();
  return <SiteFooter hideMainSection={isStudyRoomShellPath(pathname)} />;
}
