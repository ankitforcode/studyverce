import Link from "next/link";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthPageShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

export function AuthPageShell({
  title,
  description,
  children,
  className,
}: AuthPageShellProps) {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-16 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-24 bottom-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className={cn("relative w-full max-w-md", className)}>
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2.5 font-bold text-xl leading-none transition-opacity hover:opacity-90"
        >
          <BookOpen className="h-7 w-7 shrink-0 text-primary" />
          <span>StudyVerce</span>
        </Link>

        <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xl shadow-primary/5 backdrop-blur-md sm:p-8">
          <div className="mb-6 space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
