"use client";

import { useState, useTransition } from "react";
import { Check, Link2, Mail, Share2 } from "lucide-react";
import { getRoomShareLink } from "@/app/rooms/access-actions";
import { sendRoomEmailInvite } from "@/app/rooms/invite-actions";
import { useNotifications } from "@/components/notifications/notification-provider";
import { PostItIconTooltip } from "@/components/dashboard/post-it-icon-tooltip";
import { notificationMessages } from "@/lib/notifications/messages";
import { buildRoomShareUrl } from "@/lib/room-share";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ROOM_HEADER_ICON_BUTTON } from "@/lib/room-ui";
import { cn } from "@/lib/utils";

interface RoomShareLinkProps {
  roomId: string;
  roomName: string;
  slug: string;
  isPublic: boolean;
  inviteToken: string | null;
  className?: string;
}

export function RoomShareLink({
  roomId,
  roomName,
  slug,
  isPublic,
  inviteToken,
  className,
}: RoomShareLinkProps) {
  const { toast } = useNotifications();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const [invitePending, startInviteTransition] = useTransition();

  function handleCopy() {
    setError(null);
    startTransition(async () => {
      const fallbackUrl = buildRoomShareUrl(slug, isPublic, inviteToken);
      const result = await getRoomShareLink(roomId);
      const url = result.url ?? fallbackUrl;

      if (result.error && !result.url) {
        setError(result.error);
        toast(notificationMessages.actionError(result.error));
        return;
      }

      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast(notificationMessages.shareLinkCopied());
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        setError("Could not copy link. Try again.");
        toast(notificationMessages.actionError("Could not copy link. Try again."));
      }
    });
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startInviteTransition(async () => {
      const result = await sendRoomEmailInvite(roomId, inviteEmail);
      if (result.error) {
        setError(result.error);
        toast(notificationMessages.actionError(result.error));
        return;
      }

      setInviteSent(true);
      toast(
        notificationMessages.roomInviteEmailSent(
          inviteEmail.trim(),
          roomName,
          result.audience ?? "new"
        )
      );
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setInviteEmail("");
      setInviteSent(false);
      setError(null);
      setCopied(false);
    }
  }

  const label = "Share room";

  return (
    <>
      <div className={cn("flex items-center gap-2", className)}>
        <PostItIconTooltip label={label} side="bottom">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={label}
            onClick={() => setOpen(true)}
            className={ROOM_HEADER_ICON_BUTTON}
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
        </PostItIconTooltip>
        {error && !open && (
          <span className="text-xs text-destructive" title={error}>
            <Link2 className="inline h-3 w-3" />
          </span>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => handleOpenChange(false)}
        title="Share this room"
        description={
          isPublic
            ? "Copy a link or invite someone by email."
            : "Copy your private invite link or email an invitation."
        }
        bodyClassName="space-y-6"
      >
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Copy link</p>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleCopy}
            disabled={pending}
          >
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Link2 className="h-4 w-4" />}
            {copied ? "Link copied" : "Copy share link"}
          </Button>
        </div>

        <div className="border-t border-border pt-6">
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Invite by email</p>
            </div>
            <p className="text-xs text-muted-foreground">
              New users get a room invite email to register. Existing users get a sign-in link to
              the room join screen.
            </p>

            {inviteSent ? (
              <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
                Invite sent to <span className="font-medium">{inviteEmail}</span>.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="invite-email" className="sr-only">
                    Email address
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    autoComplete="email"
                    placeholder="friend@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={invitePending}>
                  {invitePending ? "Sending invite..." : "Send email invite"}
                </Button>
              </>
            )}

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </form>
        </div>
      </Modal>
    </>
  );
}
