"use client";

import { useMemo, useState, useActionState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { DoorOpen, ExternalLink, Search, Trash2 } from "lucide-react";
import type { AdminRoomRecord } from "@/lib/admin/rooms";
import {
  deleteAdminRoom,
  updateAdminRoom,
} from "@/app/admin/rooms/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminRoomsTableProps {
  rooms: AdminRoomRecord[];
}

function AdminRoomRow({ room }: { room: AdminRoomRecord }) {
  const [updateState, updateAction, updatePending] = useActionState(updateAdminRoom, {
    error: null as string | null,
  });
  const [deleteState, deleteAction, deletePending] = useActionState(deleteAdminRoom, {
    error: null as string | null,
  });

  return (
    <tr className="border-b border-border/60 align-top last:border-0">
      <td className="px-3 py-4">
        <div className="min-w-[180px] space-y-1">
          <Link
            href={`/rooms/${room.slug}`}
            className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
          >
            {room.name}
            <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
          </Link>
          <p className="font-mono text-xs text-muted-foreground">/{room.slug}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant={room.isPublic ? "default" : "secondary"}>
              {room.isPublic ? "Public" : "Private"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {room.memberCount} member{room.memberCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </td>
      <td className="px-3 py-4 text-sm">
        <Link
          href={`/profile/${room.owner.username}`}
          className="text-foreground hover:text-primary"
        >
          {room.owner.displayName}
        </Link>
        <p className="text-xs text-muted-foreground">@{room.owner.username}</p>
      </td>
      <td className="px-3 py-4 text-sm text-muted-foreground whitespace-nowrap">
        {format(new Date(room.createdAt), "MMM d, yyyy")}
      </td>
      <td className="px-3 py-4">
        <form action={updateAction} className="space-y-3 min-w-[240px]">
          <input type="hidden" name="roomId" value={room.id} />

          <div className="space-y-1">
            <Label htmlFor={`name-${room.id}`} className="text-xs">
              Name
            </Label>
            <Input
              id={`name-${room.id}`}
              name="name"
              defaultValue={room.name}
              className="h-8 text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`slug-${room.id}`} className="text-xs">
              Slug
            </Label>
            <Input
              id={`slug-${room.id}`}
              name="slug"
              defaultValue={room.slug}
              className="h-8 font-mono text-sm"
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`desc-${room.id}`} className="text-xs">
              Description
            </Label>
            <Input
              id={`desc-${room.id}`}
              name="description"
              defaultValue={room.description ?? ""}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`max-${room.id}`} className="text-xs">
              Max participants
            </Label>
            <Input
              id={`max-${room.id}`}
              name="max_participants"
              type="number"
              min={2}
              max={500}
              defaultValue={room.maxParticipants}
              className="h-8 text-sm"
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_public"
              defaultChecked={room.isPublic}
              className="rounded"
            />
            <span>Public room</span>
          </label>

          {updateState.error && (
            <p className="text-xs text-destructive">{updateState.error}</p>
          )}
          {updateState.success && !updateState.error && (
            <p className="text-xs text-primary">Saved</p>
          )}

          <Button type="submit" size="sm" disabled={updatePending} className="w-full sm:w-auto">
            {updatePending ? "Saving…" : "Save"}
          </Button>
        </form>

        <form action={deleteAction} className="mt-3 border-t border-border/60 pt-3">
          <input type="hidden" name="roomId" value={room.id} />
          {deleteState.error && (
            <p className="mb-2 text-xs text-destructive">{deleteState.error}</p>
          )}
          <Button
            type="submit"
            size="sm"
            variant="destructive"
            disabled={deletePending}
            className="w-full sm:w-auto"
            onClick={(e) => {
              if (
                !confirm(
                  `Delete "${room.name}"? This removes all members, messages, and post-its in the room.`
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {deletePending ? "Deleting…" : "Delete room"}
          </Button>
        </form>
      </td>
    </tr>
  );
}

export function AdminRoomsTable({ rooms }: AdminRoomsTableProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        r.owner.username.toLowerCase().includes(q) ||
        r.owner.displayName.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false)
    );
  }, [rooms, query]);

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-primary" />
            All rooms
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {rooms.length} total · deleting a room is permanent
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rooms…"
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Room</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Manage</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((room) => <AdminRoomRow key={room.id} room={room} />)
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-10 text-center text-muted-foreground"
                  >
                    No rooms match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
