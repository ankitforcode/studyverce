import Link from "next/link";
import {
  Users,
  Timer,
  MessageSquare,
  BarChart3,
  Sparkles,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { HomeHero } from "@/components/home/home-hero";
import { ScrollReveal } from "@/components/home/scroll-reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE_NAME } from "@/lib/site-metadata";

const features = [
  {
    icon: Users,
    title: "Virtual Study Rooms",
    description: "Join public or private rooms and study alongside others in real time.",
  },
  {
    icon: Timer,
    title: "Shared Pomodoro Timer",
    description: "Stay in sync with room members using a server-authoritative focus timer.",
  },
  {
    icon: MessageSquare,
    title: "Room Chat",
    description: "Chat with study partners, share progress, and stay accountable.",
  },
  {
    icon: BarChart3,
    title: "Focus Analytics",
    description: "Track daily streaks, weekly focus hours, and study calendar heatmaps.",
  },
  {
    icon: Sparkles,
    title: "AI Study Coach",
    description: "AI planners, flashcards, and personalized study schedules.",
  },
  {
    icon: BookOpen,
    title: "Achievement Badges",
    description: "Earn badges for streaks, focus milestones, and community participation.",
  },
];

export default function HomePage() {
  return (
    <>
      <HomeHero />

      <section
        id="about"
        aria-labelledby="about-heading"
        className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20"
      >
        <ScrollReveal>
          <h2 id="about-heading" className="text-center text-2xl font-bold sm:text-3xl">
            About {SITE_NAME}
          </h2>
          <div className="mt-6 space-y-4 text-center leading-relaxed text-muted-foreground">
            <p>
              {SITE_NAME} gives students a shared online space to study with accountability
              partners. Create or join study rooms, run synchronized focus sessions, keep
              personal task notes, and see how your study habits improve over time.
            </p>
            <p>
              Sign in with Google or email to create your {SITE_NAME} account, save your
              profile and progress, and access private rooms, friends, and focus analytics.
              We only use your Google account to authenticate you — not to access unrelated
              data.
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
            Everything you need to focus
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
            From synchronized timers to personal analytics — built for students who want
            structure without studying in isolation.
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

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <ScrollReveal>
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/10 via-transparent to-accent/10">
            <CardContent className="relative py-14 text-center sm:py-16">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"
                aria-hidden
              />
              <h2 className="relative text-2xl font-bold sm:text-3xl">
                Ready to study together?
              </h2>
              <p className="relative mx-auto mt-3 max-w-md text-muted-foreground">
                Join students who study smarter with real-time accountability and shared
                focus sessions.
              </p>
              <Link href="/auth/signup" className="relative mt-8 inline-block">
                <Button size="lg" className="gap-2">
                  Create your free account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </ScrollReveal>
      </section>
    </>
  );
}
