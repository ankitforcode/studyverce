-- Security hardening: profile privilege escalation, room join RLS, friendships, invite token leak.

-- =============================================================================
-- Profiles: block self-elevation of privileged columns
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Seed scripts, service-role SQL, and migrations run without a JWT session.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_admin_user() THEN
    RETURN NEW;
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Cannot change is_admin';
  END IF;

  IF NEW.plan_tier IS DISTINCT FROM OLD.plan_tier THEN
    RAISE EXCEPTION 'Cannot change plan_tier';
  END IF;

  IF NEW.total_focus_minutes IS DISTINCT FROM OLD.total_focus_minutes THEN
    RAISE EXCEPTION 'Cannot change total_focus_minutes';
  END IF;

  IF NEW.study_streak IS DISTINCT FROM OLD.study_streak THEN
    RAISE EXCEPTION 'Cannot change study_streak';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_privileged_columns ON public.profiles;
CREATE TRIGGER enforce_profile_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_privileged_columns();

-- =============================================================================
-- Room members: require legitimate join path; restrict role on self-insert
-- =============================================================================

CREATE OR REPLACE FUNCTION public.can_self_join_room(
  p_room_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.study_rooms sr
    WHERE sr.id = p_room_id
      AND (
        sr.is_public = TRUE
        OR sr.owner_id = p_user_id
        OR EXISTS (
          SELECT 1
          FROM public.room_access_requests rar
          WHERE rar.room_id = p_room_id
            AND rar.user_id = p_user_id
            AND rar.status = 'approved'
        )
      )
  );
$$;

DROP POLICY IF EXISTS "Users can join rooms" ON public.room_members;
CREATE POLICY "Users can join rooms"
  ON public.room_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      (
        role = 'member'
        AND public.can_self_join_room(room_id, user_id)
      )
      OR (
        role = 'owner'
        AND public.is_room_owner(room_id, user_id)
        AND NOT EXISTS (
          SELECT 1
          FROM public.room_members rm
          WHERE rm.room_id = room_members.room_id
            AND rm.user_id = user_id
        )
      )
    )
  );

-- =============================================================================
-- Friendships: pending-only inserts; recipient-only accept
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_friendship_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'pending' THEN
    RAISE EXCEPTION 'Friend requests must start as pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_friendship_insert ON public.friendships;
CREATE TRIGGER enforce_friendship_insert
  BEFORE INSERT ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_friendship_insert();

CREATE OR REPLACE FUNCTION public.enforce_friendship_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    IF auth.uid() IS NULL OR auth.uid() <> OLD.friend_id THEN
      RAISE EXCEPTION 'Only the recipient can accept a friend request';
    END IF;
  ELSIF NEW.status = 'accepted' AND OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'Invalid friendship status transition';
  ELSIF NEW.status = 'accepted' AND auth.uid() = OLD.user_id THEN
    RAISE EXCEPTION 'Cannot self-accept a friend request';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_friendship_update ON public.friendships;
CREATE TRIGGER enforce_friendship_update
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_friendship_update();

-- =============================================================================
-- Private room listing: invite token only for owners
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_private_rooms()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSON;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN '[]'::JSON;
  END IF;

  SELECT COALESCE(json_agg(row_data ORDER BY sort_at DESC), '[]'::JSON)
  INTO v_result
  FROM (
    SELECT
      json_build_object(
        'id', sr.id,
        'slug', sr.slug,
        'name', sr.name,
        'description', sr.description,
        'isPublic', sr.is_public,
        'maxParticipants', sr.max_participants,
        'memberCount', (
          SELECT COUNT(*)::INTEGER FROM public.room_members rm2 WHERE rm2.room_id = sr.id
        ),
        'createdAt', COALESCE(rar.created_at, rm.joined_at, sr.created_at),
        'inviteToken', CASE WHEN sr.owner_id = v_user_id THEN sr.invite_token ELSE NULL END,
        'ownerUsername', p.username,
        'ownerDisplayName', p.display_name,
        'ownerAvatarUrl', p.avatar_url,
        'wallpaperUrl', COALESCE(rw.thumbnail_url, rw.image_url),
        'trackName', rt.name,
        'trackArtist', rt.artist,
        'settings', sr.settings,
        'listingRole', CASE
          WHEN sr.owner_id = v_user_id THEN 'owned'
          WHEN rm.user_id IS NOT NULL THEN 'member'
          WHEN rar.status = 'pending' THEN 'pending'
          WHEN rar.status = 'approved' THEN 'member'
          ELSE 'member'
        END
      ) AS row_data,
      COALESCE(rar.created_at, rm.joined_at, sr.created_at) AS sort_at
    FROM public.study_rooms sr
    JOIN public.profiles p ON p.id = sr.owner_id
    LEFT JOIN public.room_wallpapers rw ON rw.id = sr.wallpaper_id
    LEFT JOIN public.room_tracks rt ON rt.id = sr.track_id
    LEFT JOIN public.room_members rm
      ON rm.room_id = sr.id AND rm.user_id = v_user_id
    LEFT JOIN LATERAL (
      SELECT rar_inner.id, rar_inner.status, rar_inner.created_at
      FROM public.room_access_requests rar_inner
      WHERE rar_inner.room_id = sr.id
        AND rar_inner.user_id = v_user_id
      ORDER BY rar_inner.created_at DESC
      LIMIT 1
    ) rar ON TRUE
    WHERE sr.is_public = FALSE
      AND (
        sr.owner_id = v_user_id
        OR rm.user_id IS NOT NULL
        OR rar.status IN ('pending', 'approved')
      )
      AND COALESCE(rar.status, '') <> 'revoked'
  ) sub;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_private_rooms() TO authenticated;
