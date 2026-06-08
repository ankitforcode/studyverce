import { createSiteMetadata, NOINDEX_ROBOTS } from "@/lib/site-metadata";

export const metadata = createSiteMetadata({
  robots: NOINDEX_ROBOTS,
});

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
