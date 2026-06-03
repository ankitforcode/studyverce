import { DoorOpen } from "lucide-react";
import { listAdminRooms } from "@/lib/admin/rooms";
import { AdminRoomsTable } from "@/components/admin/admin-rooms-table";

export const dynamic = "force-dynamic";

export default async function AdminRoomsPage() {
  const rooms = await listAdminRooms();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Room management</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit visibility, capacity, and metadata for any study room.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
        <DoorOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Deleting a room removes members, chat history, music state, and post-its tied
          to that room. Slug changes update the public URL immediately.
        </p>
      </div>

      <AdminRoomsTable rooms={rooms} />
    </div>
  );
}
