import { PublicPageSeo } from "@/components/seo/public-page-seo";
import { cn } from "@/lib/utils";
import type { BreadcrumbItem } from "@/lib/seo/breadcrumbs";

interface LegalPageShellProps {
  title: string;
  description: string;
  lastUpdated: string;
  breadcrumbs: BreadcrumbItem[];
  seoPath: string;
  children: React.ReactNode;
  className?: string;
}

export function LegalPageShell({
  title,
  description,
  lastUpdated,
  breadcrumbs,
  seoPath,
  children,
  className,
}: LegalPageShellProps) {
  return (
    <div className={cn("mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16", className)}>
      <PublicPageSeo
        path={seoPath}
        name={title}
        description={description}
        breadcrumbs={breadcrumbs}
        className="mb-8"
      />

      <header className="mb-10 space-y-3">
        <p className="text-sm text-muted-foreground">Last updated {lastUpdated}</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="text-base text-muted-foreground">{description}</p>
      </header>

      <div className="space-y-10">{children}</div>
    </div>
  );
}

interface LegalSectionProps {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export function LegalSection({ id, title, paragraphs, bullets }: LegalSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-muted-foreground">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {bullets && bullets.length > 0 && (
          <ul className="list-disc space-y-2 pl-5">
            {bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
