import type { LucideIcon } from "lucide-react";
import { DoorOpen, Users } from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const adminNavItems: AdminNavItem[] = [
  {
    href: "/admin/users",
    label: "Users",
    description: "Profiles, plans, and admin access",
    icon: Users,
  },
  {
    href: "/admin/rooms",
    label: "Rooms",
    description: "Public and private study rooms",
    icon: DoorOpen,
  },
];
