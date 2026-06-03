-- Public weekly focus aggregates for leaderboard (sessions are otherwise private per-user).

CREATE OR REPLACE FUNCTION public.leaderboard_weekly_focus(p_limit integer DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  weekly_minutes bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.user_id,
    COALESCE(SUM(s.focus_minutes), 0)::bigint AS weekly_minutes
  FROM public.study_sessions s
  WHERE s.focus_minutes > 0
    AND s.started_at >= date_trunc('week', timezone('utc', now()))
  GROUP BY s.user_id
  HAVING SUM(s.focus_minutes) > 0
  ORDER BY weekly_minutes DESC
  LIMIT GREATEST(COALESCE(p_limit, 50), 1);
$$;

REVOKE ALL ON FUNCTION public.leaderboard_weekly_focus(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leaderboard_weekly_focus(integer) TO anon, authenticated;
