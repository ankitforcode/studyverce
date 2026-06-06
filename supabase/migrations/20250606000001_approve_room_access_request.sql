-- Room owners approving access requests must add another user to room_members,
-- which RLS blocks on direct INSERT (only self-join is allowed). Use SECURITY DEFINER RPC.

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

  SELECT COUNT(*)::INTEGER INTO v_member_count
  FROM public.room_members
  WHERE room_id = v_request.room_id;

  IF v_member_count >= v_room.max_participants THEN
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

GRANT EXECUTE ON FUNCTION public.approve_room_access_request(UUID) TO authenticated;
