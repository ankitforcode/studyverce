import { createSiteMetadata, NOINDEX_ROBOTS } from "@/lib/site-metadata";

export const metadata = createSiteMetadata({
  path: "/auth/reset-password",
  title: "Reset Password",
  description: "Choose a new password for your StudyVerce account.",
  robots: NOINDEX_ROBOTS,
});

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
