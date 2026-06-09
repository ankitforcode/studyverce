import { createSiteMetadata, NOINDEX_ROBOTS } from "@/lib/site-metadata";

export const metadata = createSiteMetadata({
  path: "/auth/login",
  title: "Sign In",
  description: "Sign in to StudyVerce to join virtual study rooms and track your focus sessions.",
  robots: NOINDEX_ROBOTS,
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
