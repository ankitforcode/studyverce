import type { ToastInput } from "@/lib/notifications/types";

export const notificationMessages = {
  friendRequestSent: (name: string): ToastInput => ({
    action: "friend_request_sent",
    kind: "success",
    title: "Friend request sent",
    message: `Your request was sent to ${name}.`,
    href: "/friends",
  }),
  friendRequestAccepted: (name: string): ToastInput => ({
    action: "friend_request_accepted",
    kind: "success",
    title: "Friend request accepted",
    message: `You and ${name} are now friends.`,
    href: "/friends",
  }),
  friendRequestDeclined: (name: string): ToastInput => ({
    action: "friend_request_declined",
    kind: "info",
    title: "Friend request declined",
    message: `You declined ${name}'s request.`,
    href: "/friends",
  }),
  memberKicked: (name: string): ToastInput => ({
    action: "member_kicked",
    kind: "success",
    title: "Member removed",
    message: `${name} was removed from the room.`,
  }),
  accessRequested: (roomName: string): ToastInput => ({
    action: "access_requested",
    kind: "info",
    title: "Access requested",
    message: `Your request to join ${roomName} is pending owner approval.`,
  }),
  accessApproved: (roomName: string, slug: string): ToastInput => ({
    action: "access_approved",
    kind: "success",
    title: "Access approved",
    message: `You can now enter ${roomName}.`,
    href: `/rooms/${slug}`,
  }),
  accessRejected: (roomName: string): ToastInput => ({
    action: "access_rejected",
    kind: "warning",
    title: "Access declined",
    message: `Your request to join ${roomName} was declined.`,
  }),
  accessGranted: (name: string): ToastInput => ({
    action: "access_approved",
    kind: "success",
    title: "Access granted",
    message: `${name} can now join your private room.`,
  }),
  accessDenied: (name: string): ToastInput => ({
    action: "access_rejected",
    kind: "info",
    title: "Request declined",
    message: `You declined ${name}'s access request.`,
  }),
  inviteAccessRequested: (
    memberName: string,
    roomName: string,
    roomSlug: string
  ): ToastInput => ({
    action: "invite_access_requested",
    kind: "info",
    title: "Invite access request",
    message: `${memberName} requested to join ${roomName} via your share link.`,
    href: `/rooms/${roomSlug}`,
  }),
  inviteMemberJoined: (
    memberName: string,
    roomName: string,
    roomSlug: string
  ): ToastInput => ({
    action: "invite_member_joined",
    kind: "success",
    title: "Member joined",
    message: `${memberName} joined ${roomName} from your invite link.`,
    href: `/rooms/${roomSlug}`,
  }),
  favoriteAdded: (roomName?: string): ToastInput => ({
    action: "favorite_added",
    kind: "success",
    title: "Added to favorites",
    message: roomName ? `${roomName} was saved to your favorites.` : "Room saved to your favorites.",
    href: "/rooms?tab=favorites",
  }),
  favoriteRemoved: (roomName?: string): ToastInput => ({
    action: "favorite_removed",
    kind: "info",
    title: "Removed from favorites",
    message: roomName ? `${roomName} was removed from favorites.` : "Room removed from your favorites.",
    href: "/rooms?tab=favorites",
  }),
  roomVisibilityChanged: (isPublic: boolean): ToastInput => ({
    action: "room_visibility_changed",
    kind: "success",
    title: isPublic ? "Room is now public" : "Room is now private",
    message: isPublic
      ? "Anyone signed in can discover and join this room."
      : "Only people with your invite link can request access.",
  }),
  membershipInactive: (): ToastInput => ({
    action: "membership_inactive",
    kind: "warning",
    title: "Removed after inactivity",
    message: "You were removed from the room after being away. You can rejoin anytime.",
    href: "/rooms?tab=private",
  }),
  membershipKicked: (): ToastInput => ({
    action: "membership_kicked",
    kind: "error",
    title: "Removed by room owner",
    message: "The owner removed you from the room. Your access was revoked.",
    href: "/rooms",
  }),
  musicRequestSent: (trackName: string): ToastInput => ({
    action: "music_request_sent",
    kind: "success",
    title: "Music request sent",
    message: `"${trackName}" was sent to the room owner for approval.`,
  }),
  musicRequestApproved: (trackName: string): ToastInput => ({
    action: "music_request_sent",
    kind: "success",
    title: "Track approved",
    message: `"${trackName}" is now playing in the room.`,
  }),
  musicRequestRejected: (trackName: string): ToastInput => ({
    action: "music_request_sent",
    kind: "info",
    title: "Track declined",
    message: `You declined the request for "${trackName}".`,
  }),
  shareLinkCopied: (): ToastInput => ({
    action: "share_link_copied",
    kind: "success",
    title: "Link copied",
    message: "Room share link copied to your clipboard.",
  }),
  actionError: (message: string): ToastInput => ({
    action: "generic",
    kind: "error",
    title: "Something went wrong",
    message,
  }),
};
