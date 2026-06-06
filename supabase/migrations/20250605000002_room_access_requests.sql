-- Private room share links: invite preview + owner-approved access requests.

CREATE TABLE IF NOT EXISTS public.room_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_room_access_requests_pending
  ON public.room_access_requests(room_id, user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_room_access_requests_room
  ON public.room_access_requests(room_id);

CREATE INDEX IF NOT EXISTS idx_room_access_requests_user
  ON public.room_access_requests(user_id);

-- Ensure every private room has an invite token for share links.
UPDATE public.study_rooms
SET invite_token = encode(extensions.gen_random_bytes(16), 'hex')
WHERE is_public = FALSE AND invite_token IS NULL;

CREATE OR REPLACE FUNCTION public.get_room_share_preview(
  p_slug TEXT,
  p_token TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.study_rooms%ROWTYPE;
  v_member_count INTEGER;
  v_owner_name TEXT;
BEGIN
  SELECT * INTO v_room
  FROM public.study_rooms
  WHERE slug = p_slug;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF NOT v_room.is_public THEN
    IF p_token IS NULL OR v_room.invite_token IS DISTINCT FROM p_token THEN
      RETURN NULL;
    END IF;
  END IF;

  SELECT display_name INTO v_owner_name
  FROM public.profiles
  WHERE id = v_room.owner_id;

  SELECT COUNT(*)::INTEGER INTO v_member_count
  FROM public.room_members
  WHERE room_id = v_room.id;

  RETURN json_build_object(
    'id', v_room.id,
    'slug', v_room.slug,
    'name', v_room.name,
    'description', v_room.description,
    'isPublic', v_room.is_public,
    'maxParticipants', v_room.max_participants,
    'memberCount', v_member_count,
    'ownerDisplayName', COALESCE(v_owner_name, 'Unknown'),
    'ownerId', v_room.owner_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_room_share_preview(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_share_preview(TEXT, TEXT) TO anon;

CREATE OR REPLACE FUNCTION public.get_room_access_state_for_user(p_slug TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.study_rooms%ROWTYPE;
  v_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_room
  FROM public.study_rooms
  WHERE slug = p_slug;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = v_room.id AND user_id = auth.uid()
  ) OR v_room.owner_id = auth.uid() THEN
    RETURN json_build_object(
      'hasMembership', TRUE,
      'accessStatus', NULL,
      'roomName', v_room.name,
      'roomId', v_room.id,
      'isPublic', v_room.is_public
    );
  END IF;

  SELECT status INTO v_status
  FROM public.room_access_requests
  WHERE room_id = v_room.id AND user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN json_build_object(
    'hasMembership', FALSE,
    'accessStatus', v_status,
    'roomName', v_room.name,
    'roomId', v_room.id,
    'isPublic', v_room.is_public
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_room_access_state_for_user(TEXT) TO authenticated;

ALTER TABLE public.room_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own access requests"
  ON public.room_access_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Room owners can view access requests"
  ON public.room_access_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.study_rooms sr
      WHERE sr.id = room_id AND sr.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can request room access"
  ON public.room_access_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Room owners can review access requests"
  ON public.room_access_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.study_rooms sr
      WHERE sr.id = room_id AND sr.owner_id = auth.uid()
    )
  );
