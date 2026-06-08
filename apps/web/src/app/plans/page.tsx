import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PlansGrid } from "@/components/plans/plans-grid";
import { Button } from "@/components/ui/button";
import { createSiteMetadata } from "@/lib/site-metadata";

export const metadata = createSiteMetadata({
  path: "/plans",
  title: "Plans & Pricing",
  description:
    "Compare StudyVerce Free, Premium, and Institution plans. Premium from €4.99/month or €49.90/year with two months free.",
});

export default function PlansPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="hero-mesh absolute inset-0 opacity-70" />
        <div className="hero-orb hero-orb-primary absolute -left-24 top-0 h-72 w-72 rounded-full blur-3xl" />
        <div className="hero-orb hero-orb-accent absolute -right-16 top-24 h-64 w-64 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">
            Plans & pricing
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Simple plans for focused students
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Start free with virtual study rooms, shared Pomodoro timers, and accountability tools.
            Premium is €4.99/month — or save with yearly billing and get two months free.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/auth/signup">
              <Button size="lg" className="gap-2">
                Start for free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/rooms">
              <Button variant="outline" size="lg">
                Browse study rooms
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-14 sm:mt-16">
          <PlansGrid />
        </div>
      </div>
    </div>
  );
}
