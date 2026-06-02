import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardStatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  trend?: string;
  variant?: "primary" | "teal" | "accent" | "muted";
}

const variantStyles = {
  primary: "from-primary/20 via-primary/5 to-card border-primary/20",
  teal: "from-emerald-500/15 via-emerald-500/5 to-card border-emerald-500/20",
  accent: "from-accent/20 via-accent/5 to-card border-accent/20",
  muted: "from-muted/80 via-card to-card border-border",
};

export function DashboardStatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  variant = "muted",
}: DashboardStatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br p-4 shadow-sm",
        variantStyles[variant]
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="rounded-lg bg-background/50 p-2">
          <Icon className="h-4 w-4 text-foreground/80" />
        </div>
        {trend && (
          <span className="text-xs font-medium text-primary">{trend}</span>
        )}
        {hint && !trend && (
          <span className="text-xs text-muted-foreground">{hint}</span>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
