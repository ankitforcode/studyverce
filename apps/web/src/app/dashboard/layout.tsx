import { redirect } from "next/navigation";
import { createSiteMetadata, NOINDEX_ROBOTS } from "@/lib/site-metadata";
import { getSessionUser } from "@/lib/auth/server-session";

export const metadata = createSiteMetadata({
  path: "/dashboard",
  title: "Dashboard",
  description: "Your StudyVerce dashboard — study stats, calendar, quick actions, and referral progress.",
  robots: NOINDEX_ROBOTS,
});

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) redirect("/auth/login");

  return children;
}
