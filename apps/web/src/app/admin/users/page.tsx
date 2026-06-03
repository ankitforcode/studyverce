import { Shield } from "lucide-react";
import { listAdminUsers } from "@/lib/admin/users";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { requireAdminSession } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await requireAdminSession();
  const users = await listAdminUsers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">User management</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Profiles, plans, and admin access for every registered account.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          You cannot remove your own admin flag. At least one admin must remain in the
          system.
        </p>
      </div>

      <AdminUsersTable users={users} currentUserId={session.userId} />
    </div>
  );
}
