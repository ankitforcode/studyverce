"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendsPageData,
  type FriendListEntry,
  type PendingFriendRequest,
} from "@/app/friends/actions";
import { Avatar } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Search, UserCheck, UserMinus, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FriendsDirectoryProps {
  initialFriends: FriendListEntry[];
  initialPending: PendingFriendRequest[];
}

function filterByQuery<T extends { displayName: string; username: string }>(
  items: T[],
  query: string
): T[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return items;
  const normalized = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  return items.filter(
    (item) =>
      item.displayName.toLowerCase().includes(normalized) ||
      item.username.toLowerCase().includes(normalized)
  );
}

function FriendRow({
  friend,
  className,
}: {
  friend: FriendListEntry;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/30 hover:bg-muted/20",
        className
      )}
    >
      <Link href={`/profile/${friend.username}`} className="relative shrink-0">
        <Avatar src={friend.avatarUrl} fallback={friend.displayName} size="md" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/profile/${friend.username}`}
          className="truncate text-sm font-semibold text-foreground hover:text-primary"
        >
          {friend.displayName}
        </Link>
        <p className="truncate text-xs text-muted-foreground">@{friend.username}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/80">
          Friends since {new Date(friend.friendsSince).toLocaleDateString()}
        </p>
      </div>
      <Link
        href="/rooms"
        className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        Find rooms
      </Link>
    </li>
  );
}

function PendingRow({
  request,
  onAccept,
  onDecline,
  pendingActionId,
}: {
  request: PendingFriendRequest;
  onAccept: (userId: string) => void;
  onDecline: (userId: string) => void;
  pendingActionId: string | null;
}) {
  const isReceived = request.direction === "received";
  const busy = pendingActionId === request.userId;

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <Avatar src={request.avatarUrl} fallback={request.displayName} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {request.displayName}
        </p>
        <p className="truncate text-xs text-muted-foreground">@{request.username}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/80">
          {isReceived ? "Wants to be friends" : "Request sent"}
        </p>
      </div>
      {isReceived ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={busy}
            aria-label={`Accept ${request.displayName}`}
            onClick={() => onAccept(request.userId)}
            className="h-8 gap-1 px-2.5"
          >
            <Check className="h-3.5 w-3.5" />
            Accept
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            aria-label={`Decline ${request.displayName}`}
            onClick={() => onDecline(request.userId)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Pending
        </span>
      )}
    </li>
  );
}

export function FriendsDirectory({
  initialFriends,
  initialPending,
}: FriendsDirectoryProps) {
  const router = useRouter();
  const [friends, setFriends] = useState(initialFriends);
  const [pending, setPending] = useState(initialPending);
  const [query, setQuery] = useState("");
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [actionPending, startActionTransition] = useTransition();

  useEffect(() => {
    setFriends(initialFriends);
    setPending(initialPending);
  }, [initialFriends, initialPending]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const data = await getFriendsPageData();
      if (!cancelled) {
        setFriends(data.friends);
        setPending(data.pending);
      }
    }

    void refresh();
    const intervalId = window.setInterval(() => {
      void refresh();
    }, 12_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const received = useMemo(
    () => pending.filter((p) => p.direction === "received"),
    [pending]
  );
  const sent = useMemo(
    () => pending.filter((p) => p.direction === "sent"),
    [pending]
  );
  const filteredFriends = useMemo(
    () => filterByQuery(friends, query),
    [friends, query]
  );

  function handleAccept(userId: string) {
    setPendingActionId(userId);
    startActionTransition(async () => {
      const result = await acceptFriendRequest(userId);
      setPendingActionId(null);
      if (!result.error) router.refresh();
    });
  }

  function handleDecline(userId: string) {
    setPendingActionId(userId);
    startActionTransition(async () => {
      const result = await declineFriendRequest(userId);
      setPendingActionId(null);
      if (!result.error) router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background/95 backdrop-blur-md sticky top-16 z-40">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Friends</h1>
              <p className="text-sm text-muted-foreground">
                People you study with from room friend requests
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 space-y-8">
        {received.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Friend requests
                <span className="ml-1.5 font-normal text-muted-foreground">
                  ({received.length})
                </span>
              </h2>
            </div>
            <ul className="space-y-2">
              {received.map((request) => (
                <PendingRow
                  key={request.userId}
                  request={request}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  pendingActionId={actionPending ? pendingActionId : null}
                />
              ))}
            </ul>
          </section>
        )}

        {sent.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              Sent requests ({sent.length})
            </h2>
            <ul className="space-y-2">
              {sent.map((request) => (
                <PendingRow
                  key={request.userId}
                  request={request}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  pendingActionId={actionPending ? pendingActionId : null}
                />
              ))}
            </ul>
          </section>
        )}

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">
              Your friends
              <span className="ml-1.5 font-normal text-muted-foreground">
                ({friends.length})
              </span>
            </h2>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search friends"
                aria-label="Search friends"
                className="h-9 pl-8 text-xs"
              />
            </div>
          </div>

          {filteredFriends.length > 0 ? (
            <ul className="space-y-2">
              {filteredFriends.map((friend) => (
                <FriendRow key={friend.userId} friend={friend} />
              ))}
            </ul>
          ) : friends.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card py-14 text-center">
              <UserMinus className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground mb-1">No friends yet</p>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground/70">
                Send friend requests from a study room&apos;s participant list. When they
                accept, they&apos;ll show up here.
              </p>
              <Link
                href="/rooms"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Browse rooms
              </Link>
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
              No friends match &ldquo;{query.trim()}&rdquo;
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
