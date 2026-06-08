import Link from "next/link";
import {
  Users,
  Timer,
  MessageSquare,
  BarChart3,
  Sparkles,
  ArrowRight,
  BookOpen,
  StickyNote,
  Music,
} from "lucide-react";
import { HomeHero } from "@/components/home/home-hero";
import { ScrollReveal } from "@/components/home/scroll-reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HOME_FAQ } from "@/lib/seo/constants";
import { HOME_FREE_TIER_LINE } from "@/lib/plans/marketing";
import { HOME_JSON_LD } from "@/lib/seo/structured-data";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  createSiteMetadata,
} from "@/lib/site-metadata";

export const metadata = createSiteMetadata({
  path: "/",
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
});

const features = [
  {
    icon: Users,
    title: "Virtual Study Rooms",
    description:
      "Join public or private online study rooms with live presence. Free rooms support up to 20 participants; Premium supports larger groups.",
  },
  {
    icon: Timer,
    title: "Shared Pomodoro Timer",
    description:
      "Stay in sync with your study group using a shared focus timer and optional break sessions.",
  },
  {
    icon: MessageSquare,
    title: "Room Chat",
    description:
      "Chat with study partners, share progress, and stay accountable during focus sessions.",
  },
  {
    icon: StickyNote,
    title: "Personal Post-it Tasks",
    description:
      "Keep your own task notes on the room desk — private to you, scoped to each study room.",
  },
  {
    icon: Music,
    title: "Study Music",
    description:
      "Paste provider links on Free (up to 10 saved tracks) or connect Spotify, YouTube Music, and Apple Music on Premium.",
  },
  {
    icon: Sparkles,
    title: "AI Study Coach",
    description:
      "In-room assistant for study planning and motivation. Free includes daily prompts; Premium adds unlimited messages and memory.",
  },
  {
    icon: BarChart3,
    title: "Focus Dashboard",
    description:
      "Track daily streaks, weekly focus hours, and study calendar heatmaps. Advanced analytics on Premium.",
  },
  {
    icon: BookOpen,
    title: "Leaderboard & Badges",
    description:
      "Compare weekly focus with other students and earn achievement badges for streaks and milestones.",
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={[...HOME_JSON_LD]} />

      <HomeHero />

      <section
        id="about"
        aria-labelledby="about-heading"
        className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20"
      >
        <ScrollReveal>
          <h2 id="about-heading" className="text-center text-2xl font-bold sm:text-3xl">
            Online study rooms built for focus
          </h2>
          <div className="mt-6 space-y-4 text-center leading-relaxed text-muted-foreground">
            <p>
              {SITE_NAME} gives students a shared online space to study with accountability
              partners. Create or join virtual study rooms, run synchronized Pomodoro sessions,
              keep personal post-it tasks, play optional study music, and see how your study
              habits improve over time.
            </p>
            <p>
              Sign in with Google or email to create your free account, save your profile and
              progress, and access private rooms, friends, and focus tracking. We only use your
              Google account to authenticate you — not to access unrelated data. {HOME_FREE_TIER_LINE}
            </p>
          </div>
        </ScrollReveal>
      </section>

      <section
        id="features"
        aria-labelledby="features-heading"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20"
      >
        <ScrollReveal>
          <h2
            id="features-heading"
            className="mb-4 text-center text-2xl font-bold sm:text-3xl"
          >
            Everything you need to study together online
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
            From synchronized Pomodoro timers to Premium voice notes and team rooms — built for
            students who want structure without studying in isolation.{" "}
            <Link href="/plans" className="text-primary underline-offset-4 hover:underline">
              Compare plans
            </Link>
            .
          </p>
        </ScrollReveal>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <ScrollReveal key={feature.title} delayMs={index * 80}>
              <Card className="h-full border-border/50 transition-colors duration-300 hover:border-primary/30 hover:bg-card/90">
                <CardHeader>
                  <feature.icon className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section
        id="faq"
        aria-labelledby="faq-heading"
        className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20"
      >
        <ScrollReveal>
          <h2 id="faq-heading" className="text-center text-2xl font-bold sm:text-3xl">
            Frequently asked questions
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Quick answers about virtual study rooms, Pomodoro sessions, and how {SITE_NAME} works.
          </p>
          <dl className="mt-10 space-y-6">
            {HOME_FAQ.map((item) => (
              <div
                key={item.question}
                className="rounded-xl border border-border/60 bg-card/40 p-5"
              >
                <dt className="text-base font-semibold text-foreground">{item.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </ScrollReveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <ScrollReveal>
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/10 via-transparent to-accent/10">
            <CardContent className="relative py-14 text-center sm:py-16">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"
                aria-hidden
              />
              <h2 className="relative text-2xl font-bold sm:text-3xl">
                Ready to join a virtual study room?
              </h2>
              <p className="relative mx-auto mt-3 max-w-md text-muted-foreground">
                Join students who study smarter with real-time accountability, shared focus
                timers, and live study rooms.
              </p>
              <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/auth/signup">
                  <Button size="lg" className="gap-2">
                    Create your free account
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/plans">
                  <Button variant="outline" size="lg">
                    View plans
                  </Button>
                </Link>
                <Link href="/rooms">
                  <Button variant="outline" size="lg">
                    Browse study rooms
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      </section>
    </>
  );
}
