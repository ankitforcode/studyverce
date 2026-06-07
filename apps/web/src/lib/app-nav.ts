import type { LucideIcon } from "lucide-react";
import {
  Video,
  DoorOpen,
  Users,
  Timer,
  CheckSquare,
  Bell,
} from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type AppNavSection = {
  label: string;
  items: AppNavItem[];
};

export const appNavSections: AppNavSection[] = [
  {
    label: "Chill",
    items: [
      { href: "/rooms", label: "Stream", icon: Video },
      { href: "/rooms", label: "My Room", icon: DoorOpen },
      { href: "/friends", label: "Friends", icon: Users },
    ],
  },
  {
    label: "Study",
    items: [{ href: "/rooms", label: "Pomodoro", icon: Timer }],
  },
  {
    label: "Work",
    items: [
      { href: "/rooms", label: "Task", icon: CheckSquare },
      { href: "/dashboard#reminders", label: "Reminder", icon: Bell },
    ],
  },
];
