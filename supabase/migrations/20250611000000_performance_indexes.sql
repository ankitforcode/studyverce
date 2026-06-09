-- Performance: composite indexes for hot query paths + aggregated member counts RPC.

-- Dashboard: sessions for last 30 days by user
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_started
  ON public.study_sessions (user_id, started_at DESC);

-- Public room listing sort
CREATE INDEX IF NOT EXISTS idx_study_rooms_public_created
  ON public.study_rooms (created_at DESC)
  WHERE is_public = TRUE;

-- Navbar pending friend request count
CREATE INDEX IF NOT EXISTS idx_friendships_friend_status
  ON public.friendships (friend_id, status)
  WHERE status = 'pending';

-- Dashboard referral card ordering
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_created
  ON public.referrals (referrer_id, created_at DESC);

-- Room member counts at scale (PK prefix works; explicit index helps GROUP BY)
CREATE INDEX IF NOT EXISTS idx_room_members_room
  ON public.room_members (room_id);

-- Aggregated member counts for room listing (avoids fetching every member row).
CREATE OR REPLACE FUNCTION public.get_room_member_counts(p_room_ids UUID[])
RETURNS TABLE(room_id UUID, member_count INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rm.room_id, COUNT(*)::INTEGER AS member_count
  FROM public.room_members rm
  WHERE rm.room_id = ANY(p_room_ids)
  GROUP BY rm.room_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_room_member_counts(UUID[]) TO anon, authenticated;
