import { createSiteMetadata, NOINDEX_ROBOTS } from "@/lib/site-metadata";

export const metadata = createSiteMetadata({
  path: "/auth/signup",
  title: "Sign Up",
  description: "Create a free StudyVerce account and start studying together online.",
  robots: NOINDEX_ROBOTS,
});

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
