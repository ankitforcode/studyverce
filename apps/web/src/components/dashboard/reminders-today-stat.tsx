"use client";

import { Bell } from "lucide-react";
import { useNotifications } from "@/components/notifications/notification-provider";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";

export function RemindersTodayStat() {
  const { notifications } = useNotifications();

  const pendingReminders = notifications.filter(
    (entry) => entry.remindOnLogin && !entry.dismissed
  ).length;

  return (
    <DashboardStatCard
      label="Reminders"
      value={String(pendingReminders)}
      icon={Bell}
      hint={
        pendingReminders === 0 ? "none pending" : "saved for next login"
      }
      variant="muted"
    />
  );
}
