"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { DoorOpen, ExternalLink, Pencil, Search, Trash2 } from "lucide-react";
import type { AdminRoomRecord } from "@/lib/admin/rooms";
import { deleteAdminRoom, updateAdminRoom } from "@/app/admin/rooms/actions";
import { AdminRoomEditModal } from "@/components/admin/admin-room-edit-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminRoomsTableProps {
  rooms: AdminRoomRecord[];
}

export function AdminRoomsTable({ rooms }: AdminRoomsTableProps) {
  const [query, setQuery] = useState("");
  const [editingRoom, setEditingRoom] = useState<AdminRoomRecord | null>(null);

  const [updateState, updateAction, updatePending] = useActionState(updateAdminRoom, {
    error: null as string | null,
  });
  const [deleteState, deleteAction, deletePending] = useActionState(deleteAdminRoom, {
    error: null as string | null,
  });

  useEffect(() => {
    if (updateState.success) {
      setEditingRoom(null);
    }
  }, [updateState.success]);

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

  function handleDelete(room: AdminRoomRecord) {
    if (
      !confirm(
        `Delete "${room.name}"? This removes all members, messages, and post-its in the room.`
      )
    ) {
      return;
    }

    const formData = new FormData();
    formData.set("roomId", room.id);
    deleteAction(formData);
  }

  return (
    <>
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
          {deleteState.error && (
            <p className="px-4 pb-3 text-sm text-destructive">{deleteState.error}</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Room</th>
                  <th className="px-3 py-2 font-medium">Owner</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-3 py-2 font-medium">Capacity</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((room) => (
                    <tr
                      key={room.id}
                      className="border-b border-border/60 align-middle last:border-0"
                    >
                      <td className="px-3 py-3">
                        <div className="min-w-[180px] space-y-1">
                          <Link
                            href={`/rooms/${room.slug}`}
                            className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
                          >
                            {room.name}
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                          </Link>
                          <p className="font-mono text-xs text-muted-foreground">
                            /{room.slug}
                          </p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <Badge variant={room.isPublic ? "default" : "secondary"}>
                              {room.isPublic ? "Public" : "Private"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {room.memberCount} member
                              {room.memberCount === 1 ? "" : "s"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <Link
                          href={`/profile/${room.owner.username}`}
                          className="text-foreground hover:text-primary"
                        >
                          {room.owner.displayName}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          @{room.owner.username}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-muted-foreground">
                        {format(new Date(room.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-muted-foreground">
                        {room.memberCount} / {room.maxParticipants}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRoom(room)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={deletePending}
                            onClick={() => handleDelete(room)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-10 text-center text-muted-foreground"
                    >
                      {rooms.length === 0
                        ? "No study rooms yet."
                        : "No rooms match your search."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AdminRoomEditModal
        key={editingRoom?.id ?? "closed"}
        room={editingRoom}
        open={editingRoom !== null}
        onClose={() => setEditingRoom(null)}
        formAction={updateAction}
        pending={updatePending}
        error={updateState.error}
      />
    </>
  );
}
