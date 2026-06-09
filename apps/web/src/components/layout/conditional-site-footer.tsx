"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { createClient } from "@/lib/supabase/client";

/** Active study room page (`/rooms/:slug`), not listing, create, or invite flows. */
export function isStudyRoomShellPath(pathname: string): boolean {
  return /^\/rooms\/(?!new$)[^/]+$/.test(pathname);
}

export function ConditionalSiteFooter() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    void supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(Boolean(data.user));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SiteFooter
      hideMainSection={isStudyRoomShellPath(pathname)}
      hideAuthLinks={isLoggedIn}
    />
  );
}
