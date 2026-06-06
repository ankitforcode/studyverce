-- List private rooms the current user has requested access to (Friends tab).

CREATE OR REPLACE FUNCTION public.get_user_pending_access_rooms()
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

  SELECT COALESCE(json_agg(row_data ORDER BY row_data->>'createdAt' DESC), '[]'::JSON)
  INTO v_result
  FROM (
    SELECT json_build_object(
      'id', sr.id,
      'slug', sr.slug,
      'name', sr.name,
      'description', sr.description,
      'isPublic', sr.is_public,
      'maxParticipants', sr.max_participants,
      'memberCount', (
        SELECT COUNT(*)::INTEGER FROM public.room_members rm WHERE rm.room_id = sr.id
      ),
      'createdAt', rar.created_at,
      'inviteToken', sr.invite_token,
      'ownerUsername', p.username,
      'ownerDisplayName', p.display_name,
      'ownerAvatarUrl', p.avatar_url,
      'wallpaperUrl', COALESCE(rw.thumbnail_url, rw.image_url),
      'trackName', rt.name,
      'trackArtist', rt.artist,
      'settings', sr.settings,
      'accessStatus', rar.status
    ) AS row_data
    FROM public.room_access_requests rar
    JOIN public.study_rooms sr ON sr.id = rar.room_id
    JOIN public.profiles p ON p.id = sr.owner_id
    LEFT JOIN public.room_wallpapers rw ON rw.id = sr.wallpaper_id
    LEFT JOIN public.room_tracks rt ON rt.id = sr.track_id
    WHERE rar.user_id = v_user_id
      AND rar.status = 'pending'
  ) sub;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_pending_access_rooms() TO authenticated;
