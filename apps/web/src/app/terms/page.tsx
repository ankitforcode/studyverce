import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import {
  TERMS_CONTACT_EMAIL,
  TERMS_LAST_UPDATED,
  termsSections,
} from "@/lib/legal/terms-content";
import { createSiteMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = createSiteMetadata({
  title: "Terms of Service",
  description:
    "Terms governing your use of StudyVerce virtual study rooms, focus tracking, chat, and related features.",
});

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      description="Rules for using StudyVerce when you study together online."
      lastUpdated={TERMS_LAST_UPDATED}
    >
      <nav
        aria-label="Terms of service sections"
        className="rounded-xl border border-border/60 bg-card/40 p-5"
      >
        <p className="mb-3 text-sm font-medium text-foreground">On this page</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {termsSections.map((section) => (
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

      {termsSections.map((section) => (
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
          href={`mailto:${TERMS_CONTACT_EMAIL}`}
          className="font-medium text-primary hover:underline"
        >
          {TERMS_CONTACT_EMAIL}
        </a>
        . See also our{" "}
        <Link href="/privacy" className="font-medium text-primary hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </LegalPageShell>
  );
}
