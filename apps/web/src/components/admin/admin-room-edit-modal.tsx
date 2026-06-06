"use client";

import type { AdminRoomRecord } from "@/lib/admin/rooms";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

interface AdminRoomEditModalProps {
  room: AdminRoomRecord | null;
  open: boolean;
  onClose: () => void;
  formAction: (payload: FormData) => void;
  pending: boolean;
  error: string | null;
}

export function AdminRoomEditModal({
  room,
  open,
  onClose,
  formAction,
  pending,
  error,
}: AdminRoomEditModalProps) {
  if (!room) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit room"
      description={room.name}
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="roomId" value={room.id} />

        <div className="space-y-1.5">
          <Label htmlFor="admin-room-name">Name</Label>
          <Input
            id="admin-room-name"
            name="name"
            defaultValue={room.name}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admin-room-slug">Slug</Label>
          <Input
            id="admin-room-slug"
            name="slug"
            defaultValue={room.slug}
            className="font-mono"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admin-room-desc">Description</Label>
          <Input
            id="admin-room-desc"
            name="description"
            defaultValue={room.description ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admin-room-max">Max participants</Label>
          <Input
            id="admin-room-max"
            name="max_participants"
            type="number"
            min={2}
            max={500}
            defaultValue={room.maxParticipants}
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

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
