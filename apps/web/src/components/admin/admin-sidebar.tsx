"use client";

import { NavLink } from "@/components/layout/nav-link";
import { adminNavItems } from "@/lib/admin/nav";
import { cn } from "@/lib/utils";

const sideLinkClass =
  "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors text-muted-foreground hover:bg-muted/60 hover:text-foreground";

export function AdminSidebar() {
  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Admin">
      {adminNavItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.href}
            href={item.href}
            match="prefix"
            className={sideLinkClass}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0">
              <span className="block font-medium">{item.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {item.description}
              </span>
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export function AdminMobileNav() {
  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 md:hidden"
      aria-label="Admin"
    >
      {adminNavItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.href}
            href={item.href}
            match="prefix"
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
