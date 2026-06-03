"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface NavLinkProps extends ComponentProps<typeof Link> {
  match?: "exact" | "prefix";
}

export function NavLink({
  href,
  className,
  match = "prefix",
  children,
  ...props
}: NavLinkProps) {
  const pathname = usePathname();
  const path = typeof href === "string" ? href : (href.pathname ?? "");
  const active =
    match === "exact"
      ? pathname === path
      : path === "/"
        ? pathname === "/"
        : pathname === path || pathname.startsWith(`${path}/`);

  return (
    <Link
      href={href}
      className={cn(
        className,
        active && "bg-muted/80 text-foreground"
      )}
      aria-current={active ? "page" : undefined}
      {...props}
    >
      {children}
    </Link>
  );
}
