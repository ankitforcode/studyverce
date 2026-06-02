"use client";

import { usePathname } from "next/navigation";

export function ConditionalNavbar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNavbar = pathname.startsWith("/dashboard");

  if (hideNavbar) return null;
  return <>{children}</>;
}
