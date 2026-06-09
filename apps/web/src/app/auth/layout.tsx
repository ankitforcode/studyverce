import { createSiteMetadata, NOINDEX_ROBOTS } from "@/lib/site-metadata";

export const metadata = createSiteMetadata({
  path: "/auth",
  title: "Account",
  description: "Sign in or create a StudyVerce account to join virtual study rooms.",
  robots: NOINDEX_ROBOTS,
});

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
