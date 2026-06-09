import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import type { BreadcrumbItem } from "@/lib/seo/breadcrumbs";
import { breadcrumbJsonLd } from "@/lib/seo/breadcrumbs";
import { webPageJsonLd } from "@/lib/seo/structured-data";
import { cn } from "@/lib/utils";

type PublicPageSeoProps = {
  path: string;
  name: string;
  description: string;
  breadcrumbs: BreadcrumbItem[];
  className?: string;
};

/** Visible breadcrumbs + WebPage and BreadcrumbList JSON-LD for indexable routes. */
export function PublicPageSeo({
  path,
  name,
  description,
  breadcrumbs,
  className,
}: PublicPageSeoProps) {
  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({ path, name, description }),
          breadcrumbJsonLd(breadcrumbs),
        ]}
      />
      <Breadcrumbs items={breadcrumbs} className={className} />
    </>
  );
}
