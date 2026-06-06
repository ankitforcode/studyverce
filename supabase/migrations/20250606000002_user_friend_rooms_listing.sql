-- Friends tab: show pending requests AND private rooms the user can enter after approval.

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
        'inviteToken', sr.invite_token,
        'ownerUsername', p.username,
        'ownerDisplayName', p.display_name,
        'ownerAvatarUrl', p.avatar_url,
        'wallpaperUrl', COALESCE(rw.thumbnail_url, rw.image_url),
        'trackName', rt.name,
        'trackArtist', rt.artist,
        'settings', sr.settings,
        'accessStatus', CASE
          WHEN rm.user_id IS NOT NULL THEN 'approved'
          ELSE rar.status
        END
      ) AS row_data,
      COALESCE(rar.created_at, rm.joined_at, sr.created_at) AS sort_at
    FROM public.study_rooms sr
    JOIN public.profiles p ON p.id = sr.owner_id
    LEFT JOIN public.room_wallpapers rw ON rw.id = sr.wallpaper_id
    LEFT JOIN public.room_tracks rt ON rt.id = sr.track_id
    LEFT JOIN public.room_members rm
      ON rm.room_id = sr.id AND rm.user_id = v_user_id
    LEFT JOIN public.room_access_requests rar
      ON rar.room_id = sr.id
      AND rar.user_id = v_user_id
      AND rar.status = 'pending'
    WHERE sr.is_public = FALSE
      AND sr.owner_id <> v_user_id
      AND (
        rm.user_id IS NOT NULL
        OR rar.id IS NOT NULL
      )
  ) sub;

  RETURN v_result;
END;
$$;
