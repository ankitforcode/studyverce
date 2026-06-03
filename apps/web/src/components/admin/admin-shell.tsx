import { AdminMobileNav, AdminSidebar } from "@/components/admin/admin-sidebar";

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background">
      <AdminMobileNav />
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-56 shrink-0 border-r border-border md:block">
          <AdminSidebar />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
