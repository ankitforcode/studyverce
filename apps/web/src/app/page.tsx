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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 text-center relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6">
            <BookOpen className="h-4 w-4" aria-hidden />
            {SITE_NAME}
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
            {SITE_NAME}
          </h1>
          <p className="text-lg sm:text-xl text-foreground max-w-3xl mx-auto mb-4 font-medium">
            {SITE_NAME} is a virtual study platform that helps students join live focus
            rooms, sync Pomodoro timers with others, chat while they study, and track focus
            over time.
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Study together. Stay accountable. Focus better — so you never have to study
            alone again.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
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
        </div>
      </section>

      <section
        id="about"
        aria-labelledby="about-heading"
        className="mx-auto max-w-3xl px-4 py-12 sm:px-6"
      >
        <h2 id="about-heading" className="text-2xl font-bold text-center mb-4">
          About {SITE_NAME}
        </h2>
        <div className="space-y-4 text-center text-muted-foreground leading-relaxed">
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
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-center mb-10">Everything you need to focus</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-border/50">
              <CardHeader>
                <feature.icon className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-3">Ready to study together?</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Join thousands of students who study smarter with real-time accountability.
            </p>
            <Link href="/auth/signup">
              <Button size="lg">Create your free account</Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
