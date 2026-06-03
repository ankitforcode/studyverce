import { requireAdminSession } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession("/admin");
  return <AdminShell>{children}</AdminShell>;
}
