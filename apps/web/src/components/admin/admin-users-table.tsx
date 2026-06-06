"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Pencil, Search, Shield, Trash2 } from "lucide-react";
import type { AdminUserRecord } from "@/lib/admin/users";
import { deleteAdminUser, updateAdminUser } from "@/app/admin/users/actions";
import { AdminUserEditModal } from "@/components/admin/admin-user-edit-modal";
import { Avatar, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFocusTime } from "@/lib/utils";

interface AdminUsersTableProps {
  users: AdminUserRecord[];
  currentUserId: string;
}

function planLabel(tier: AdminUserRecord["planTier"]) {
  if (tier === "premium") return "Premium";
  if (tier === "institution") return "Institution";
  return "Free";
}

export function AdminUsersTable({ users, currentUserId }: AdminUsersTableProps) {
  const [query, setQuery] = useState("");
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);

  const [updateState, updateAction, updatePending] = useActionState(updateAdminUser, {
    error: null as string | null,
  });
  const [deleteState, deleteAction, deletePending] = useActionState(deleteAdminUser, {
    error: null as string | null,
  });

  useEffect(() => {
    if (updateState.success) {
      setEditingUser(null);
    }
  }, [updateState.success]);

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

  function handleDelete(user: AdminUserRecord) {
    if (
      !confirm(
        `Delete ${user.displayName} (@${user.username})? This permanently removes their account and all associated data.`
      )
    ) {
      return;
    }

    const formData = new FormData();
    formData.set("userId", user.id);
    deleteAction(formData);
  }

  return (
    <>
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
          {deleteState.error && (
            <p className="px-4 pb-3 text-sm text-destructive">{deleteState.error}</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Plan</th>
                  <th className="px-3 py-2 font-medium">Joined</th>
                  <th className="px-3 py-2 font-medium">Activity</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((user) => {
                    const isSelf = user.id === currentUserId;

                    return (
                      <tr
                        key={user.id}
                        className="border-b border-border/60 align-middle last:border-0"
                      >
                        <td className="px-3 py-3">
                          <div className="flex min-w-[200px] items-center gap-3">
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
                                <p className="truncate text-xs text-muted-foreground">
                                  {user.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="secondary">{planLabel(user.planTier)}</Badge>
                            {user.isAdmin && <Badge>Admin</Badge>}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm text-muted-foreground">
                          {format(new Date(user.createdAt), "MMM d, yyyy")}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm">
                          {formatFocusTime(user.totalFocusMinutes)}
                          <span className="text-muted-foreground">
                            {" "}
                            · {user.studyStreak}d streak
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingUser(user)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={deletePending || isSelf}
                              onClick={() => handleDelete(user)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-10 text-center text-muted-foreground"
                    >
                      {users.length === 0
                        ? "No registered users yet."
                        : "No users match your search."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AdminUserEditModal
        key={editingUser?.id ?? "closed"}
        user={editingUser}
        open={editingUser !== null}
        onClose={() => setEditingUser(null)}
        formAction={updateAction}
        pending={updatePending}
        error={updateState.error}
        currentUserId={currentUserId}
      />
    </>
  );
}
