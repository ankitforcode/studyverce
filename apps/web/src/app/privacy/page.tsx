import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import {
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_LAST_UPDATED,
  privacySections,
} from "@/lib/legal/privacy-content";
import { createSiteMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = createSiteMetadata({
  path: "/privacy",
  title: "Privacy Policy",
  description:
    "How StudyVerce collects, uses, and protects your information when you use virtual study rooms, Pomodoro timers, focus tracking, and related features.",
});

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      description="How StudyVerce handles your information when you study together online."
      lastUpdated={PRIVACY_LAST_UPDATED}
    >
      <nav
        aria-label="Privacy policy sections"
        className="rounded-xl border border-border/60 bg-card/40 p-5"
      >
        <p className="mb-3 text-sm font-medium text-foreground">On this page</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {privacySections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {privacySections.map((section) => (
        <LegalSection
          key={section.id}
          id={section.id}
          title={section.title}
          paragraphs={section.paragraphs}
          bullets={section.bullets}
        />
      ))}

      <p className="border-t border-border pt-8 text-sm text-muted-foreground">
        Questions?{" "}
        <a
          href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
          className="font-medium text-primary hover:underline"
        >
          {PRIVACY_CONTACT_EMAIL}
        </a>
        . See also our{" "}
        <Link href="/terms" className="font-medium text-primary hover:underline">
          Terms of Service
        </Link>
        .
      </p>
    </LegalPageShell>
  );
}
