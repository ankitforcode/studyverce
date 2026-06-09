import { requireAdminSession } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { createSiteMetadata, NOINDEX_ROBOTS } from "@/lib/site-metadata";

export const metadata = createSiteMetadata({
  path: "/admin",
  title: "Admin",
  description: "StudyVerce admin — manage users, rooms, and platform settings.",
  robots: NOINDEX_ROBOTS,
});

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession("/admin");
  return <AdminShell>{children}</AdminShell>;
}
