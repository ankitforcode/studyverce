"use client";

import { useActionState } from "react";
import { createRoomAction } from "@/app/rooms/new/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function CreateRoomForm() {
  const [state, formAction, pending] = useActionState(createRoomAction, { error: null as string | null });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a Study Room</CardTitle>
        <CardDescription>Set up a space for you and others to study together</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Room name</Label>
            <Input id="name" name="name" placeholder="Late Night CS Study" required maxLength={80} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="What will you study in this room?"
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_participants">Max participants</Label>
            <Input
              id="max_participants"
              name="max_participants"
              type="number"
              defaultValue={50}
              min={2}
              max={100}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_public" defaultChecked className="rounded" />
            Make this room public
          </label>

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating..." : "Create Room"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
