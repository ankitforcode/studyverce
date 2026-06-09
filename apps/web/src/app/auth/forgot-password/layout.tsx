import { createSiteMetadata, NOINDEX_ROBOTS } from "@/lib/site-metadata";

export const metadata = createSiteMetadata({
  path: "/auth/forgot-password",
  title: "Forgot Password",
  description: "Reset your StudyVerce account password.",
  robots: NOINDEX_ROBOTS,
});

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
