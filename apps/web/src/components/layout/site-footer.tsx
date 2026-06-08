import Link from "next/link";
import { BookOpen } from "lucide-react";
import { CookieSettingsButton } from "@/components/consent/cookie-settings-button";
import {
  PRIVACY_POLICY_PATH,
  TERMS_OF_SERVICE_PATH,
} from "@/lib/legal/urls";
import { SITE_NAME } from "@/lib/site-metadata";
import { cn } from "@/lib/utils";

const productLinks = [
  { href: "/rooms", label: "Study rooms" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/auth/signup", label: "Sign up" },
  { href: "/auth/login", label: "Log in" },
] as const;

const exploreLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#about", label: "About" },
  { href: "/#faq", label: "FAQ" },
  { href: "/rooms", label: "Browse rooms" },
] as const;

const legalLinks = [
  { href: TERMS_OF_SERVICE_PATH, label: "Terms of Service" },
  { href: PRIVACY_POLICY_PATH, label: "Privacy Policy" },
] as const;

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "border-t border-border/60 bg-background/90 backdrop-blur-sm",
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-bold text-lg leading-none"
            >
              <BookOpen className="h-5 w-5 text-primary" aria-hidden />
              {SITE_NAME}
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Free virtual study rooms with shared Pomodoro timers, study music, and focus
              analytics — study together online and stay accountable.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Product</h3>
            <ul className="mt-4 space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Explore</h3>
            <ul className="mt-4 space-y-2.5">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Legal</h3>
            <ul className="mt-4 space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <CookieSettingsButton className="text-sm text-muted-foreground transition-colors hover:text-foreground" />
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
          <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-5 sm:justify-end">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <CookieSettingsButton className="transition-colors hover:text-foreground" />
          </nav>
        </div>
      </div>
    </footer>
  );
}
