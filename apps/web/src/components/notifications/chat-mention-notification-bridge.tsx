"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { ChatMentionNotification } from "@studyverce/shared";
import { useNotifications } from "@/components/notifications/notification-provider";
import { useSocket } from "@/hooks/use-socket";
import { notificationMessages } from "@/lib/notifications/messages";

export function ChatMentionNotificationBridge() {
  const { socket, connected } = useSocket();
  const { toast } = useNotifications();
  const pathname = usePathname();

  useEffect(() => {
    if (!socket || !connected) return;

    const onMentionNotification = (payload: ChatMentionNotification) => {
      const roomPath = `/rooms/${payload.roomSlug}`;
      const inRoom = pathname === roomPath;
      const senderName =
        payload.senderDisplayName || payload.senderUsername || "Someone";

      toast({
        ...notificationMessages.chatMention(
          senderName,
          payload.roomName,
          payload.roomSlug,
          payload.contentPreview
        ),
        showToast: !inRoom,
      });
    };

    socket.on("chat:mention-notification", onMentionNotification);

    return () => {
      socket.off("chat:mention-notification", onMentionNotification);
    };
  }, [socket, connected, toast, pathname]);

  return null;
}
