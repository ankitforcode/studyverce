"use client";

import { useEffect } from "react";
import type { RoomInviteOwnerNotification } from "@studyverce/shared";
import { useNotifications } from "@/components/notifications/notification-provider";
import { useSocket } from "@/hooks/use-socket";
import { notificationMessages } from "@/lib/notifications/messages";

export function RoomOwnerNotificationBridge() {
  const { socket, connected } = useSocket();
  const { toast } = useNotifications();

  useEffect(() => {
    if (!socket || !connected) return;

    const onInviteOwnerNotification = (payload: RoomInviteOwnerNotification) => {
      const memberName = payload.memberDisplayName || payload.memberUsername || "Someone";
      if (payload.kind === "access_requested") {
        toast(
          notificationMessages.inviteAccessRequested(
            memberName,
            payload.roomName,
            payload.roomSlug
          )
        );
        return;
      }

      toast(
        notificationMessages.inviteMemberJoined(
          memberName,
          payload.roomName,
          payload.roomSlug
        )
      );
    };

    socket.on("room:invite-owner-notification", onInviteOwnerNotification);

    return () => {
      socket.off("room:invite-owner-notification", onInviteOwnerNotification);
    };
  }, [socket, connected, toast]);

  return null;
}
