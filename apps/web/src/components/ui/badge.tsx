import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, variant = "default", ...props }: React.ComponentProps<"span"> & { variant?: "default" | "secondary" | "outline" | "accent" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variant === "default" && "bg-primary/20 text-primary",
        variant === "secondary" && "bg-secondary text-secondary-foreground",
        variant === "outline" && "border border-border text-foreground",
        variant === "accent" && "bg-accent/20 text-accent",
        className
      )}
      {...props}
    />
  );
}

export function Avatar({ className, src, fallback, size = "md" }: { className?: string; src?: string | null; fallback: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg" }[size];
  return (
    <div className={cn("relative flex shrink-0 overflow-hidden rounded-full bg-secondary", sizeClass, className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="aspect-square h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-medium uppercase">
          {fallback.slice(0, 2)}
        </span>
      )}
    </div>
  );
}
