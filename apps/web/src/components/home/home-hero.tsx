"use client";

import Link from "next/link";
import {
  ArrowRight,
  MessageSquare,
  Timer,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/site-metadata";

const previewChips = [
  { icon: Timer, label: "Focus: 24:59", className: "-left-3 top-1/4 sm:-left-6" },
  { icon: MessageSquare, label: "Room chat", className: "-right-2 bottom-1/4 sm:-right-5" },
] as const;

export function HomeHero() {
  return (
    <section className="relative overflow-hidden border-b border-border/40">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="hero-mesh absolute inset-0" />
        <div className="hero-grid absolute inset-0 opacity-30" />
        <div className="hero-orb hero-orb-primary absolute -left-32 top-0 h-96 w-96 rounded-full blur-3xl" />
        <div className="hero-orb hero-orb-accent absolute -right-24 top-10 h-80 w-80 rounded-full blur-3xl" />
        <div className="hero-content-bridge absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-14">
          {/* Copy */}
          <div className="mx-auto max-w-xl text-center lg:mx-0 lg:max-w-none lg:text-left">
            <div className="hero-fade-in hero-delay-1 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-sm text-primary lg:justify-start">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                12 studying now
              </span>
              <span className="hidden text-primary/40 sm:inline" aria-hidden>
                ·
              </span>
              <span className="text-primary/90">Virtual study rooms</span>
            </div>

            <h1 className="hero-fade-in hero-delay-2 mt-5 text-4xl font-bold tracking-tight sm:text-5xl xl:text-[3.25rem] xl:leading-[1.1]">
              <span className="block text-foreground">Virtual study rooms</span>
              <span className="mt-1 block bg-gradient-to-r from-primary via-emerald-300 to-primary bg-clip-text text-transparent">
                Study together. Focus better.
              </span>
            </h1>

            <p className="hero-fade-in hero-delay-3 mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Join live online study rooms, sync Pomodoro timers with others, and track your
              progress — free accountability for students who don&apos;t want to study alone.
            </p>

            <div className="hero-fade-in hero-delay-4 mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full gap-2 sm:w-auto">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/rooms">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Browse study rooms
                </Button>
              </Link>
            </div>

            <ul className="hero-fade-in hero-delay-5 mt-8 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              {[
                { icon: Users, label: "Live rooms" },
                { icon: Timer, label: "Shared timers" },
                { icon: MessageSquare, label: "Room chat" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/50 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    {item.label}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Room preview */}
          <div className="hero-fade-in hero-delay-3 mx-auto w-full max-w-sm sm:max-w-md lg:mx-0 lg:ml-auto lg:max-w-[340px]">
            <div className="relative">
              {previewChips.map((chip) => {
                const Icon = chip.icon;
                return (
                  <div
                    key={chip.label}
                    className={`hero-float-card absolute z-10 hidden items-center gap-2 rounded-xl border border-primary/20 bg-card/80 px-3 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur-md sm:flex ${chip.className}`}
                    aria-hidden
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    {chip.label}
                  </div>
                );
              })}

              <div className="hero-preview-glow relative rounded-2xl border border-border/60 bg-card/80 p-1 shadow-2xl backdrop-blur-md">
                <div className="rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                      <div className="h-2.5 w-2.5 rounded-full bg-primary/80" />
                    </div>
                    <span className="truncate text-xs text-muted-foreground">
                      Night Owls · Public
                    </span>
                  </div>

                  <div className="mb-5 flex items-center justify-center">
                    <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-primary/30 bg-primary/5 sm:h-36 sm:w-36">
                      <span className="font-mono text-3xl font-bold text-primary sm:text-4xl">
                        24:59
                      </span>
                      <div className="absolute inset-0 rounded-full border-2 border-primary/20 hero-timer-ring" />
                      <svg
                        className="absolute inset-0 -rotate-90"
                        viewBox="0 0 100 100"
                        aria-hidden
                      >
                        <circle
                          cx="50"
                          cy="50"
                          r="46"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeDasharray="217 289"
                          className="text-primary/50"
                        />
                      </svg>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-lg bg-background/40 px-3 py-2">
                      <Users className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-sm">Alex, Jordan, and 9 others</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-background/40 px-3 py-2">
                      <MessageSquare className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate text-sm text-muted-foreground">
                        &ldquo;25 min focus — let&apos;s go!&rdquo;
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground lg:text-left">
              A peek inside a live {SITE_NAME} room
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
