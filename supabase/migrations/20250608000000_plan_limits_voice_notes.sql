-- Plan-based room capacity (Free = 20) + room voice notes for Premium

-- ---------------------------------------------------------------------------
-- Approve access: respect Free-plan participant cap (20) for room owner
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_room_access_request(p_request_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.room_access_requests%ROWTYPE;
  v_room public.study_rooms%ROWTYPE;
  v_member_count INTEGER;
  v_owner_plan public.profiles.plan_tier%TYPE;
  v_effective_max INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  SELECT * INTO v_request
  FROM public.room_access_requests
  WHERE id = p_request_id;

  IF NOT FOUND OR v_request.status <> 'pending' THEN
    RETURN json_build_object('error', 'Request not found or already reviewed.');
  END IF;

  SELECT * INTO v_room
  FROM public.study_rooms
  WHERE id = v_request.room_id;

  IF NOT FOUND OR v_room.owner_id <> auth.uid() THEN
    RETURN json_build_object('error', 'Only the room owner can approve access requests.');
  END IF;

  SELECT plan_tier INTO v_owner_plan
  FROM public.profiles
  WHERE id = v_room.owner_id;

  v_effective_max := v_room.max_participants;
  IF COALESCE(v_owner_plan, 'free') = 'free' THEN
    v_effective_max := LEAST(v_room.max_participants, 20);
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_member_count
  FROM public.room_members
  WHERE room_id = v_request.room_id;

  IF v_member_count >= v_effective_max THEN
    RETURN json_build_object('error', 'This room is full.');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = v_request.room_id AND user_id = v_request.user_id
  ) THEN
    INSERT INTO public.room_members (room_id, user_id, role)
    VALUES (v_request.room_id, v_request.user_id, 'member');
  END IF;

  UPDATE public.room_access_requests
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = NOW()
  WHERE id = p_request_id;

  RETURN json_build_object(
    'error', NULL,
    'slug', v_room.slug,
    'requestId', p_request_id,
    'roomId', v_request.room_id,
    'userId', v_request.user_id,
    'status', 'approved'
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Room voice notes (Premium: record, share, transcribe)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  duration_seconds NUMERIC(10, 2),
  transcript TEXT,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  shared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS room_voice_notes_room_shared_idx
  ON public.room_voice_notes (room_id, is_shared, created_at DESC);

CREATE INDEX IF NOT EXISTS room_voice_notes_user_idx
  ON public.room_voice_notes (user_id, created_at DESC);

ALTER TABLE public.room_voice_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_voice_notes_select"
  ON public.room_voice_notes
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      is_shared = TRUE
      AND EXISTS (
        SELECT 1 FROM public.room_members rm
        WHERE rm.room_id = room_voice_notes.room_id
          AND rm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "room_voice_notes_insert_own"
  ON public.room_voice_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "room_voice_notes_update_own"
  ON public.room_voice_notes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "room_voice_notes_delete_own"
  ON public.room_voice_notes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Storage bucket (also seeded in seed.sql for local reset)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'room-voice-notes',
  'room-voice-notes',
  TRUE,
  10485760,
  ARRAY['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "room_voice_notes_storage_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'room-voice-notes');

CREATE POLICY "room_voice_notes_storage_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'room-voice-notes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "room_voice_notes_storage_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'room-voice-notes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
