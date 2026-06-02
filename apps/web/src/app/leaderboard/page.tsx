import Link from "next/link";
import { Trophy, Construction } from "lucide-react";
import { FEATURE_FLAGS } from "@studyverse/shared";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/badge";
import { formatFocusTime } from "@/lib/utils";

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: leaders } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, total_focus_minutes, study_streak")
    .order("total_focus_minutes", { ascending: false })
    .limit(20);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="h-8 w-8 text-accent" />
        <div>
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground">Top studiers by total focus time</p>
        </div>
      </div>

      {!FEATURE_FLAGS.leaderboards && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 p-3 rounded-lg bg-secondary/50">
          <Construction className="h-4 w-4" />
          Full leaderboard features coming in Phase 2 — basic rankings shown below
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All-Time Focus Hours</CardTitle>
        </CardHeader>
        <CardContent>
          {leaders && leaders.length > 0 ? (
            <ol className="space-y-3">
              {leaders.map((leader, i) => (
                <li key={leader.username} className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <Avatar src={leader.avatar_url} fallback={leader.display_name} size="sm" />
                  <Link
                    href={`/profile/${leader.username}`}
                    className="flex-1 text-sm font-medium hover:text-primary transition-colors"
                  >
                    {leader.display_name}
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    {formatFocusTime(leader.total_focus_minutes)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground text-sm">No data yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
