"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  filterParticipantsForViewer,
  isParticipantActiveForViewer,
  normalizePresenceMode,
  viewPresenceMode,
  type RoomParticipant,
  type RoomPresenceMode,
} from "@studyverce/shared";
import {
  acceptFriendRequest,
  getFriendshipStatuses,
  sendFriendRequest,
  type FriendshipUiStatus,
} from "@/app/friends/actions";
import { kickRoomMember } from "@/app/rooms/member-actions";
import { useNotifications } from "@/components/notifications/notification-provider";
import { PostItIconTooltip } from "@/components/dashboard/post-it-icon-tooltip";
import { notificationMessages } from "@/lib/notifications/messages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppSocket } from "@/hooks/use-socket";
import {
  ChevronDown,
  EyeOff,
  Moon,
  Radio,
  Search,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import {
  ROOM_FIELD,
  ROOM_HEADER_CONTROL,
  ROOM_HEADER_SECONDARY_TEXT,
  ROOM_PORTAL_LIGHT_THEME,
} from "@/lib/room-ui";
import type { RoomAppearance } from "@/lib/room-appearance";
import { cn } from "@/lib/utils";

interface ParticipantListProps {
  participants: RoomParticipant[];
  currentUserId: string;
  roomId?: string;
  roomOwnerId?: string;
  isRoomOwner?: boolean;
  socket?: AppSocket | null;
  onSetPresenceMode?: (mode: RoomPresenceMode) => void;
  variant?: "card" | "compact";
  menuAlign?: "start" | "end";
  roomAppearance?: RoomAppearance;
  className?: string;
}

const PARTICIPANT_PANEL_WIDTH = 336;
const PARTICIPANT_PANEL_GAP = 8;

const PRESENCE_OPTIONS: {
  mode: RoomPresenceMode;
  label: string;
  Icon: typeof Radio;
}[] = [
  { mode: "active", label: "Active", Icon: Radio },
  { mode: "away", label: "Away", Icon: Moon },
  { mode: "invisible", label: "Invisible", Icon: EyeOff },
];

function PresenceDot({
  mode,
  viewerUserId,
  participant,
}: {
  mode?: RoomPresenceMode;
  viewerUserId?: string;
  participant?: RoomParticipant;
}) {
  const resolved =
    mode ??
    (participant && viewerUserId
      ? viewPresenceMode(participant, viewerUserId)
      : "active");

  return (
    <span
      className={cn(
        "rounded-full ring-2 ring-card/80",
        resolved === "active"
          ? "bg-primary"
          : resolved === "away"
            ? "bg-yellow-400"
            : "bg-muted-foreground/60",
        "absolute bottom-0 right-0 h-2 w-2"
      )}
      title={
        resolved === "active"
          ? "Active"
          : resolved === "away"
            ? "Away"
            : "Invisible"
      }
    />
  );
}

function sortOtherParticipants(
  participants: RoomParticipant[],
  currentUserId: string
): RoomParticipant[] {
  return [...participants]
    .filter((p) => p.userId !== currentUserId)
    .sort((a, b) => {
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

function CurrentUserSection({
  participant,
  onSetPresenceMode,
}: {
  participant: RoomParticipant;
  onSetPresenceMode?: (mode: RoomPresenceMode) => void;
}) {
  const mode = normalizePresenceMode(participant.presenceMode);

  return (
    <div className="mx-2 mb-2 rounded-lg border border-primary/35 bg-primary/5 px-2 py-2 light:border-primary/25 light:bg-primary/8">
      <div className="flex items-center gap-2">
        <div className="relative shrink-0">
          <Avatar src={participant.avatarUrl} fallback={participant.displayName} size="sm" />
          <PresenceDot mode={mode} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {participant.displayName}
            <span className="ml-1 font-normal text-muted-foreground">(you)</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">@{participant.username}</p>
        </div>
      </div>
      <div
        role="group"
        aria-label="Your presence"
        className="mt-2 grid grid-cols-3 gap-1"
      >
        {PRESENCE_OPTIONS.map(({ mode: optionMode, label, Icon }) => (
          <button
            key={optionMode}
            type="button"
            aria-pressed={mode === optionMode}
            onClick={() => onSetPresenceMode?.(optionMode)}
            className={cn(
              "flex items-center justify-center gap-1 rounded-md border px-1 py-1 text-[10px] font-medium transition-colors",
              mode === optionMode
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border/50 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            <Icon className="h-3 w-3 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ParticipantRow({
  participant,
  currentUser,
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
  currentUser?: RoomParticipant;
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
  const { toast } = useNotifications();
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
    if (!canFriend || friendPending) return;

    if (friendshipStatus === "pending_received") {
      startFriendTransition(async () => {
        const result = await acceptFriendRequest(participant.userId);
        if (result.error) {
          toast(notificationMessages.actionError(result.error));
          return;
        }
        if (result.status) {
          onFriendshipChange(participant.userId, result.status);
          toast(notificationMessages.friendRequestAccepted(participant.displayName));
          if (roomId) {
            socket?.emit("friend:reviewed", {
              roomId,
              requesterId: participant.userId,
              status: "accepted",
            });
          }
        }
      });
      return;
    }

    if (friendshipStatus !== "none") return;

    startFriendTransition(async () => {
      const result = await sendFriendRequest(participant.userId);
      if (result.error) {
        toast(notificationMessages.actionError(result.error));
        return;
      }
      if (result.status === "pending_sent") {
        toast(notificationMessages.friendRequestSent(participant.displayName));
      }
      if (result.status === "pending_sent" && roomId && currentUser) {
        socket?.emit("friend:request-created", {
          roomId,
          toUserId: participant.userId,
          request: {
            userId: currentUser.userId,
            username: currentUser.username,
            displayName: currentUser.displayName,
            avatarUrl: currentUser.avatarUrl,
            roomId,
            createdAt: new Date().toISOString(),
          },
        });
      }
      if (result.status) {
        onFriendshipChange(participant.userId, result.status);
      }
    });
  }

  function handleKick() {
    if (!canKick || !roomId || kickPending) return;
    startKickTransition(async () => {
      const result = await kickRoomMember(roomId, participant.userId);
      if (result.error) {
        toast(notificationMessages.actionError(result.error));
        return;
      }
      toast(notificationMessages.memberKicked(participant.displayName));
      socket?.emit("room:member:kick", { roomId, userId: participant.userId });
    });
  }

  const friendLabel =
    friendshipStatus === "accepted"
      ? "Friends"
      : friendshipStatus === "pending_sent"
        ? "Request sent"
        : friendshipStatus === "pending_received"
          ? "Accept friend request"
          : friendshipStatus === "blocked"
            ? "Blocked"
            : "Send friend request";

  const FriendActionIcon =
    friendshipStatus === "pending_received" ? UserCheck : UserPlus;

  return (
    <li
      className="participant-row-enter flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/40"
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      <div className="relative shrink-0">
        <Avatar src={participant.avatarUrl} fallback={participant.displayName} size="sm" />
        <PresenceDot participant={participant} viewerUserId={currentUserId} />
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
          <PostItIconTooltip label={friendLabel} side={actionTooltipSide} align="end">
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
              <FriendActionIcon className="h-3.5 w-3.5" />
            </Button>
          </PostItIconTooltip>
        )}
        {canKick && (
          <PostItIconTooltip
            label="Remove from room"
            side={actionTooltipSide}
            align="end"
          >
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
  onSetPresenceMode,
  menuAlign = "end",
  roomAppearance = "dark",
  className,
}: {
  participants: RoomParticipant[];
  currentUserId: string;
  roomId?: string;
  roomOwnerId?: string;
  isRoomOwner?: boolean;
  socket?: AppSocket | null;
  onSetPresenceMode?: (mode: RoomPresenceMode) => void;
  menuAlign?: "start" | "end";
  roomAppearance?: RoomAppearance;
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
  const visibleParticipants = useMemo(
    () => filterParticipantsForViewer(participants, currentUserId),
    [participants, currentUserId]
  );
  const currentUser = useMemo(
    () => visibleParticipants.find((p) => p.userId === currentUserId),
    [visibleParticipants, currentUserId]
  );
  const sortedOthers = useMemo(
    () => sortOtherParticipants(visibleParticipants, currentUserId),
    [visibleParticipants, currentUserId]
  );
  const filteredOthers = useMemo(
    () => filterParticipantsBySearch(sortedOthers, searchQuery),
    [sortedOthers, searchQuery]
  );
  const displayOrder = useMemo(
    () => (currentUser ? [currentUser, ...sortedOthers] : sortedOthers),
    [currentUser, sortedOthers]
  );
  const activeCount = visibleParticipants.filter((p) => p.isActive).length;
  const awayCount = visibleParticipants.length - activeCount;
  const youAreActive = normalizePresenceMode(currentUser?.presenceMode) === "active";

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

    let cancelled = false;

    async function loadFriendshipData() {
      const ids = sortedOthers.map((p) => p.userId);
      if (ids.length === 0) {
        setFriendshipStatuses({});
        return;
      }
      const statuses = await getFriendshipStatuses(ids);
      if (cancelled) return;
      setFriendshipStatuses(statuses);
    }

    void loadFriendshipData();
    const intervalId = window.setInterval(() => {
      void loadFriendshipData();
    }, 8_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [open, sortedOthers, currentUserId]);

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
          "rounded-xl border border-border/60 bg-card/95 p-2 shadow-xl light:bg-white/98",
          roomAppearance === "light" && ROOM_PORTAL_LIGHT_THEME
        )}
      >
        <div className="border-b border-border/50 px-2 pb-2 pt-1">
          <p className="text-xs font-semibold text-foreground">In this room</p>
          <p className="text-[11px] text-muted-foreground">
            {visibleParticipants.length === 0
              ? "No one else here yet"
              : `${activeCount} active${awayCount > 0 ? ` · ${awayCount} away` : ""}`}
          </p>
        </div>

        {visibleParticipants.length === 0 ? (
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

            <div className="max-h-64 overflow-y-auto py-1">
              {currentUser && (
                <CurrentUserSection
                  participant={currentUser}
                  onSetPresenceMode={onSetPresenceMode}
                />
              )}

              {filteredOthers.length === 0 ? (
                searchQuery.trim() ? (
                  <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                    No other users match &ldquo;{searchQuery.trim()}&rdquo;
                  </p>
                ) : sortedOthers.length === 0 ? (
                  <p className="px-2 pb-2 text-center text-xs text-muted-foreground">
                    No one else here yet.
                  </p>
                ) : null
              ) : (
                <>
                  {currentUser && filteredOthers.length > 0 && (
                    <div className="mx-2 mb-1 border-t border-border/40" />
                  )}
                  <ul className="space-y-0.5">
                    {filteredOthers.map((p, index) => (
                      <ParticipantRow
                        key={p.userId}
                        participant={p}
                        currentUser={currentUser}
                        currentUserId={currentUserId}
                        roomId={roomId}
                        roomOwnerId={roomOwnerId}
                        isRoomOwner={isRoomOwner}
                        socket={socket}
                        friendshipStatus={friendshipStatuses[p.userId] ?? "none"}
                        animationDelayMs={40 + index * 45}
                        actionTooltipSide={
                          index === filteredOthers.length - 1 ? "top" : "bottom"
                        }
                        onFriendshipChange={(userId, status) => {
                          setFriendshipStatuses((prev) => ({ ...prev, [userId]: status }));
                        }}
                      />
                    ))}
                  </ul>
                </>
              )}
            </div>
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
          "flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-foreground transition-colors",
          "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "bg-muted/25"
        )}
      >
        <Users className={cn("h-4 w-4 shrink-0", ROOM_HEADER_SECONDARY_TEXT)} />
        {visibleParticipants.length === 0 ? (
          <span className={cn("text-xs", ROOM_HEADER_SECONDARY_TEXT)}>Just you</span>
        ) : (
          <>
            <div className="flex -space-x-2">
              {displayOrder.slice(0, 6).map((p) => (
                <div key={p.userId} className="relative" title={p.displayName}>
                  <Avatar
                    src={p.avatarUrl}
                    fallback={p.displayName}
                    size="sm"
                    className="ring-2 ring-card/80"
                  />
                  <PresenceDot participant={p} viewerUserId={currentUserId} />
                </div>
              ))}
            </div>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-xs",
                ROOM_HEADER_SECONDARY_TEXT
              )}
            >
              {activeCount} active
              {awayCount > 0 && ` · ${awayCount} away`}
              {youAreActive && " · you're in the room"}
            </span>
          </>
        )}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            ROOM_HEADER_SECONDARY_TEXT,
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
  onSetPresenceMode,
  variant = "card",
  menuAlign = "end",
  roomAppearance = "dark",
  className,
}: ParticipantListProps) {
  const visibleParticipants = useMemo(
    () => filterParticipantsForViewer(participants, currentUserId),
    [participants, currentUserId]
  );
  const activeCount = visibleParticipants.filter((p) => p.isActive).length;
  const currentUser = useMemo(
    () => visibleParticipants.find((p) => p.userId === currentUserId),
    [visibleParticipants, currentUserId]
  );
  const sortedOthers = useMemo(
    () => sortOtherParticipants(visibleParticipants, currentUserId),
    [visibleParticipants, currentUserId]
  );

  if (variant === "compact") {
    return (
      <CompactParticipantList
        participants={participants}
        currentUserId={currentUserId}
        roomId={roomId}
        roomOwnerId={roomOwnerId}
        isRoomOwner={isRoomOwner}
        socket={socket}
        onSetPresenceMode={onSetPresenceMode}
        menuAlign={menuAlign}
        roomAppearance={roomAppearance}
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
            ({activeCount} active{visibleParticipants.length > activeCount ? ` · ${visibleParticipants.length} in room` : ""})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {visibleParticipants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one here yet</p>
        ) : (
          <div className="space-y-2">
            {currentUser && (
              <CurrentUserSection
                participant={currentUser}
                onSetPresenceMode={onSetPresenceMode}
              />
            )}
            <ul className="space-y-2">
              {sortedOthers.map((p) => (
                <li key={p.userId} className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar src={p.avatarUrl} fallback={p.displayName} size="sm" />
                    <PresenceDot participant={p} viewerUserId={currentUserId} />
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      !isParticipantActiveForViewer(p, currentUserId) && "text-muted-foreground"
                    )}
                  >
                    {p.displayName}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
