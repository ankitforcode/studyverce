"use client";

import { useMemo, useState, useActionState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Search, Shield } from "lucide-react";
import type { AdminUserRecord } from "@/lib/admin/users";
import { updateAdminUser } from "@/app/admin/users/actions";
import { Avatar, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFocusTime } from "@/lib/utils";

interface AdminUsersTableProps {
  users: AdminUserRecord[];
  currentUserId: string;
}

function AdminUserRow({
  user,
  currentUserId,
}: {
  user: AdminUserRecord;
  currentUserId: string;
}) {
  const [state, formAction, pending] = useActionState(updateAdminUser, {
    error: null as string | null,
  });
  const isSelf = user.id === currentUserId;

  return (
    <tr className="border-b border-border/60 align-top last:border-0">
      <td className="px-3 py-4">
        <div className="flex items-center gap-3 min-w-[200px]">
          <Avatar src={null} fallback={user.displayName} size="sm" />
          <div className="min-w-0">
            <Link
              href={`/profile/${user.username}`}
              className="font-medium text-foreground hover:text-primary"
            >
              {user.displayName}
            </Link>
            <p className="truncate text-xs text-muted-foreground">
              @{user.username}
            </p>
            {user.email && (
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-4 text-sm text-muted-foreground whitespace-nowrap">
        {format(new Date(user.createdAt), "MMM d, yyyy")}
      </td>
      <td className="px-3 py-4 text-sm whitespace-nowrap">
        {formatFocusTime(user.totalFocusMinutes)}
        <span className="text-muted-foreground"> · {user.studyStreak}d streak</span>
      </td>
      <td className="px-3 py-4">
        <form action={formAction} className="space-y-3 min-w-[220px]">
          <input type="hidden" name="userId" value={user.id} />

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`username-${user.id}`} className="text-xs">
                Username
              </Label>
              <Input
                id={`username-${user.id}`}
                name="username"
                defaultValue={user.username}
                className="h-8 text-sm"
                required
                minLength={3}
                maxLength={30}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`display-${user.id}`} className="text-xs">
                Display name
              </Label>
              <Input
                id={`display-${user.id}`}
                name="display_name"
                defaultValue={user.displayName}
                className="h-8 text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor={`plan-${user.id}`} className="text-xs">
              Plan
            </Label>
            <select
              id={`plan-${user.id}`}
              name="plan_tier"
              defaultValue={user.planTier}
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
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

          {state.error && (
            <p className="text-xs text-destructive">{state.error}</p>
          )}
          {state.success && !state.error && (
            <p className="text-xs text-primary">Saved</p>
          )}

          <Button type="submit" size="sm" disabled={pending} className="w-full sm:w-auto">
            {pending ? "Saving…" : "Save"}
          </Button>
        </form>
      </td>
    </tr>
  );
}

export function AdminUsersTable({ users, currentUserId }: AdminUsersTableProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        (u.email?.toLowerCase().includes(q) ?? false)
    );
  }, [users, query]);

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            All users
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {users.length} registered · changes apply immediately
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users…"
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Joined</th>
                <th className="px-3 py-2 font-medium">Activity</th>
                <th className="px-3 py-2 font-medium">Manage</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((user) => (
                  <AdminUserRow
                    key={user.id}
                    user={user}
                    currentUserId={currentUserId}
                  />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-10 text-center text-muted-foreground"
                  >
                    No users match your search.
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
