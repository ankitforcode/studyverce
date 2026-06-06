"use client";

import type { AdminUserRecord } from "@/lib/admin/users";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

interface AdminUserEditModalProps {
  user: AdminUserRecord | null;
  open: boolean;
  onClose: () => void;
  formAction: (payload: FormData) => void;
  pending: boolean;
  error: string | null;
  currentUserId: string;
}

export function AdminUserEditModal({
  user,
  open,
  onClose,
  formAction,
  pending,
  error,
  currentUserId,
}: AdminUserEditModalProps) {
  if (!user) return null;

  const isSelf = user.id === currentUserId;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit user"
      description={`@${user.username}`}
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="userId" value={user.id} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="admin-user-username">Username</Label>
            <Input
              id="admin-user-username"
              name="username"
              defaultValue={user.username}
              required
              minLength={3}
              maxLength={30}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-user-display">Display name</Label>
            <Input
              id="admin-user-display"
              name="display_name"
              defaultValue={user.displayName}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admin-user-plan">Plan</Label>
          <select
            id="admin-user-plan"
            name="plan_tier"
            defaultValue={user.planTier}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="free">Free</option>
            <option value="premium">Premium</option>
            <option value="institution">Institution</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_admin"
              defaultChecked={user.isAdmin}
              disabled={isSelf}
              className="rounded"
            />
            <span>Admin</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="onboarding_completed"
              defaultChecked={user.onboardingCompleted}
              className="rounded"
            />
            <span>Onboarded</span>
          </label>
        </div>

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
