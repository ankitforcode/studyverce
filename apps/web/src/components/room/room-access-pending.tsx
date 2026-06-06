import { Clock, DoorOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RoomAccessPendingProps {
  roomName: string;
}

export function RoomAccessPending({ roomName }: RoomAccessPendingProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-lg items-center px-4 py-10 sm:px-6">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15">
              <DoorOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{roomName}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Private study room</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Clock className="h-4 w-4 text-primary" />
              Waiting for owner approval
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your access request is pending. The room owner will need to approve
              you before you can enter.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
