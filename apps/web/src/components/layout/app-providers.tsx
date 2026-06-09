"use client";

import type { ReactNode } from "react";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { QueryToastHandler } from "@/components/notifications/query-toast-handler";
import { RoomOwnerNotificationBridge } from "@/components/notifications/room-owner-notification-bridge";
import { ChatMentionNotificationBridge } from "@/components/notifications/chat-mention-notification-bridge";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider>
      <QueryToastHandler />
      <RoomOwnerNotificationBridge />
      <ChatMentionNotificationBridge />
      {children}
    </NotificationProvider>
  );
}
