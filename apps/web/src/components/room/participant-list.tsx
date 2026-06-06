"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import type { RoomParticipant } from "@studyverce/shared";
import {
  getFriendshipStatuses,
  sendFriendRequest,
  type FriendshipUiStatus,
} from "@/app/friends/actions";
import { kickRoomMember } from "@/app/rooms/member-actions";
import { PostItIconTooltip } from "@/components/dashboard/post-it-icon-tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppSocket } from "@/hooks/use-socket";
import { ChevronDown, Search, UserPlus, UserX, Users } from "lucide-react";
import { ROOM_FIELD, ROOM_HEADER_CONTROL } from "@/lib/room-ui";
import { cn } from "@/lib/utils";

interface ParticipantListProps {
  participants: RoomParticipant[];
  currentUserId: string;
  roomId?: string;
  roomOwnerId?: string;
  isRoomOwner?: boolean;
  socket?: AppSocket | null;
  variant?: "card" | "compact";
  menuAlign?: "start" | "end";
  className?: string;
}

const PARTICIPANT_PANEL_WIDTH = 336;
const PARTICIPANT_PANEL_GAP = 8;

function PresenceDot({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full ring-2 ring-card/80",
        isActive ? "bg-primary" : "bg-yellow-400",
        "absolute bottom-0 right-0 h-2 w-2"
      )}
      title={isActive ? "In room" : "Away"}
    />
  );
}

function sortParticipants(participants: RoomParticipant[]): RoomParticipant[] {
  return [...participants].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });
}

function filterParticipantsBySearch(
  participants: RoomParticipant[],
  query: string
): RoomParticipant[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return participants;

  const normalized = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  return participants.filter(
    (p) =>
      p.displayName.toLowerCase().includes(normalized) ||
      p.username.toLowerCase().includes(normalized)
  );
}

function ParticipantRow({
  participant,
  currentUserId,
  roomId,
  roomOwnerId,
  isRoomOwner,
  socket,
  friendshipStatus,
  animationDelayMs,
  actionTooltipSide = "bottom",
  onFriendshipChange,
}: {
  participant: RoomParticipant;
  currentUserId: string;
  roomId?: string;
  roomOwnerId?: string;
  isRoomOwner?: boolean;
  socket?: AppSocket | null;
  friendshipStatus: FriendshipUiStatus;
  animationDelayMs: number;
  actionTooltipSide?: "top" | "bottom";
  onFriendshipChange: (userId: string, status: FriendshipUiStatus) => void;
}) {
  const [friendPending, startFriendTransition] = useTransition();
  const [kickPending, startKickTransition] = useTransition();
  const isYou = participant.userId === currentUserId;
  const canKick =
    isRoomOwner &&
    !isYou &&
    roomId &&
    participant.userId !== roomOwnerId;
  const canFriend = !isYou;

  function handleFriendRequest() {
    if (!canFriend || friendPending || friendshipStatus !== "none") return;
    startFriendTransition(async () => {
      const result = await sendFriendRequest(participant.userId);
      if (result.status) {
        onFriendshipChange(participant.userId, result.status);
      }
    });
  }

  function handleKick() {
    if (!canKick || !roomId || kickPending) return;
    startKickTransition(async () => {
      const result = await kickRoomMember(roomId, participant.userId);
      if (result.error) return;
      socket?.emit("room:member:kick", { roomId, userId: participant.userId });
    });
  }

  const friendLabel =
    friendshipStatus === "accepted"
      ? "Friends"
      : friendshipStatus === "pending_sent"
        ? "Request sent"
        : friendshipStatus === "pending_received"
          ? "Request received"
          : friendshipStatus === "blocked"
            ? "Blocked"
            : "Send friend request";

  return (
    <li
      className="participant-row-enter flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/40"
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      <div className="relative shrink-0">
        <Avatar src={participant.avatarUrl} fallback={participant.displayName} size="sm" />
        <PresenceDot isActive={participant.isActive} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {participant.displayName}
          {isYou && <span className="ml-1 font-normal text-muted-foreground">(you)</span>}
        </p>
        <p className="truncate text-xs text-muted-foreground">@{participant.username}</p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {canFriend && (
          <PostItIconTooltip label={friendLabel} side={actionTooltipSide}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={
                friendPending ||
                friendshipStatus === "accepted" ||
                friendshipStatus === "pending_sent" ||
                friendshipStatus === "blocked"
              }
              aria-label={friendLabel}
              onClick={handleFriendRequest}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary disabled:opacity-50"
            >
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
          </PostItIconTooltip>
        )}
        {canKick && (
          <PostItIconTooltip label="Remove from room" side={actionTooltipSide}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={kickPending}
              aria-label={`Remove ${participant.displayName} from room`}
              onClick={handleKick}
              className="h-7 w-7 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            >
              <UserX className="h-3.5 w-3.5" />
            </Button>
          </PostItIconTooltip>
        )}
      </div>
    </li>
  );
}

function CompactParticipantList({
  participants,
  currentUserId,
  roomId,
  roomOwnerId,
  isRoomOwner,
  socket,
  menuAlign = "end",
  className,
}: {
  participants: RoomParticipant[];
  currentUserId: string;
  roomId?: string;
  roomOwnerId?: string;
  isRoomOwner?: boolean;
  socket?: AppSocket | null;
  menuAlign?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{ top: number; left: number } | null>(
    null
  );
  const [friendshipStatuses, setFriendshipStatuses] = useState<
    Record<string, FriendshipUiStatus>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const sorted = useMemo(() => sortParticipants(participants), [participants]);
  const filtered = useMemo(
    () => filterParticipantsBySearch(sorted, searchQuery),
    [sorted, searchQuery]
  );
  const activeCount = participants.filter((p) => p.isActive).length;
  const awayCount = participants.length - activeCount;
  const youAreActive = participants.some(
    (p) => p.userId === currentUserId && p.isActive
  );

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const maxLeft = window.innerWidth - PARTICIPANT_PANEL_WIDTH - PARTICIPANT_PANEL_GAP;
    const left =
      menuAlign === "end"
        ? Math.min(Math.max(PARTICIPANT_PANEL_GAP, rect.right - PARTICIPANT_PANEL_WIDTH), maxLeft)
        : Math.min(Math.max(PARTICIPANT_PANEL_GAP, rect.left), maxLeft);

    setPanelPosition({
      top: rect.bottom + PARTICIPANT_PANEL_GAP,
      left,
    });
  }, [menuAlign]);

  useEffect(() => {
    if (!open) {
      setPanelPosition(null);
      return;
    }

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (searchQuery.trim()) {
        setSearchQuery("");
        return;
      }
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    const focusTimer = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLInputElement>('input[aria-label="Search participants"]')
        ?.focus();
    }, 0);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, updatePanelPosition, searchQuery]);

  useEffect(() => {
    if (!open) setSearchQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const ids = sorted.map((p) => p.userId).filter((id) => id !== currentUserId);
    if (ids.length === 0) {
      setFriendshipStatuses({});
      return;
    }

    let cancelled = false;
    void getFriendshipStatuses(ids).then((statuses) => {
      if (!cancelled) setFriendshipStatuses(statuses);
    });

    return () => {
      cancelled = true;
    };
  }, [open, sorted, currentUserId]);

  const panel =
    open && panelPosition ? (
      <div
        ref={panelRef}
        id={panelId}
        role="listbox"
        aria-label="Users in this room"
        style={{
          position: "fixed",
          top: panelPosition.top,
          left: panelPosition.left,
          width: PARTICIPANT_PANEL_WIDTH,
        }}
        className={cn(
          "participant-panel-enter z-[120]",
          ROOM_HEADER_CONTROL,
          "rounded-xl border border-border/60 bg-card/95 p-2 shadow-xl light:bg-white/98"
        )}
      >
        <div className="border-b border-border/50 px-2 pb-2 pt-1">
          <p className="text-xs font-semibold text-foreground">In this room</p>
          <p className="text-[11px] text-muted-foreground">
            {participants.length === 0
              ? "No one else here yet"
              : `${activeCount} active${awayCount > 0 ? ` · ${awayCount} away` : ""}`}
          </p>
        </div>

        {sorted.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            You&apos;re the only one here right now.
          </p>
        ) : (
          <>
            <div className="border-b border-border/50 px-2 py-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or @handle"
                  aria-label="Search participants"
                  className={cn(ROOM_FIELD, "h-8 pl-8 text-xs")}
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                No users match &ldquo;{searchQuery.trim()}&rdquo;
              </p>
            ) : (
              <ul className="max-h-64 space-y-0.5 overflow-y-auto py-1">
                {filtered.map((p, index) => (
                  <ParticipantRow
                    key={p.userId}
                    participant={p}
                    currentUserId={currentUserId}
                    roomId={roomId}
                    roomOwnerId={roomOwnerId}
                    isRoomOwner={isRoomOwner}
                    socket={socket}
                    friendshipStatus={friendshipStatuses[p.userId] ?? "none"}
                    animationDelayMs={40 + index * 45}
                    actionTooltipSide={index === filtered.length - 1 ? "top" : "bottom"}
                    onFriendshipChange={(userId, status) => {
                      setFriendshipStatuses((prev) => ({ ...prev, [userId]: status }));
                    }}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    ) : null;

  return (
    <div className={cn("relative min-w-0", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="listbox"
        className={cn(
          "flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
          "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "bg-muted/25"
        )}
      >
        <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
        {participants.length === 0 ? (
          <span className="text-xs text-muted-foreground">Just you</span>
        ) : (
          <>
            <div className="flex -space-x-2">
              {sorted.slice(0, 6).map((p) => (
                <div key={p.userId} className="relative" title={p.displayName}>
                  <Avatar
                    src={p.avatarUrl}
                    fallback={p.displayName}
                    size="sm"
                    className="ring-2 ring-card/80"
                  />
                  <PresenceDot isActive={p.isActive} />
                </div>
              ))}
            </div>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {activeCount} active
              {awayCount > 0 && ` · ${awayCount} away`}
              {youAreActive && " · you're in the room"}
            </span>
          </>
        )}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {typeof document !== "undefined" && panel
        ? createPortal(panel, document.body)
        : null}
    </div>
  );
}

export function ParticipantList({
  participants,
  currentUserId,
  roomId,
  roomOwnerId,
  isRoomOwner = false,
  socket = null,
  variant = "card",
  menuAlign = "end",
  className,
}: ParticipantListProps) {
  const activeCount = participants.filter((p) => p.isActive).length;
  const sorted = useMemo(() => sortParticipants(participants), [participants]);

  if (variant === "compact") {
    return (
      <CompactParticipantList
        participants={participants}
        currentUserId={currentUserId}
        roomId={roomId}
        roomOwnerId={roomOwnerId}
        isRoomOwner={isRoomOwner}
        socket={socket}
        menuAlign={menuAlign}
        className={className}
      />
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Participants
          <span className="text-sm font-normal text-muted-foreground">
            ({activeCount} active{participants.length > activeCount ? ` · ${participants.length} in room` : ""})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {participants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one here yet</p>
        ) : (
          <ul className="space-y-2">
            {sorted.map((p) => (
              <li key={p.userId} className="flex items-center gap-2">
                <div className="relative">
                  <Avatar src={p.avatarUrl} fallback={p.displayName} size="sm" />
                  <PresenceDot isActive={p.isActive} />
                </div>
                <span className={cn("text-sm", !p.isActive && "text-muted-foreground")}>
                  {p.displayName}
                  {p.userId === currentUserId && (
                    <span className="text-muted-foreground ml-1">(you)</span>
                  )}
                  {!p.isActive && (
                    <span className="text-muted-foreground ml-1">· away</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
