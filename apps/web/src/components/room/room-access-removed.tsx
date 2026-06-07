import Link from "next/link";
import { DoorOpen, UserX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RoomAccessRemovedProps {
  roomName: string;
}

export function RoomAccessRemoved({ roomName }: RoomAccessRemovedProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-lg items-center px-4 py-10 sm:px-6">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/15">
              <DoorOpen className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-xl">{roomName}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Private study room</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <UserX className="h-4 w-4 text-destructive" />
              You were removed by the room owner
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your access to this private room was revoked. You cannot rejoin or request
              access again unless the owner shares a new invite with you outside the app.
            </p>
          </div>
          <Link
            href="/rooms?tab=private"
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            Back to private rooms
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
