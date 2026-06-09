export type NotificationKind = "success" | "error" | "info" | "warning";

export type NotificationAction =
  | "friend_request_sent"
  | "friend_request_accepted"
  | "friend_request_declined"
  | "member_kicked"
  | "access_requested"
  | "access_approved"
  | "access_rejected"
  | "invite_access_requested"
  | "invite_member_joined"
  | "favorite_added"
  | "favorite_removed"
  | "room_visibility_changed"
  | "membership_inactive"
  | "membership_kicked"
  | "music_request_sent"
  | "chat_mention"
  | "share_link_copied"
  | "password_reset"
  | "generic";

export type AppNotification = {
  id: string;
  action: NotificationAction;
  kind: NotificationKind;
  title: string;
  message: string;
  href?: string;
  createdAt: string;
  read: boolean;
  dismissed: boolean;
  remindOnLogin: boolean;
};

export type ToastInput = {
  action?: NotificationAction;
  kind: NotificationKind;
  title: string;
  message: string;
  href?: string;
  /** When false, shows toast only without saving to the inbox. Default true. */
  persist?: boolean;
  /** When false, saves to inbox without showing a floating toast. Default true. */
  showToast?: boolean;
};

export type ActiveToast = ToastInput & {
  id: string;
  createdAt: number;
  exiting?: boolean;
};
