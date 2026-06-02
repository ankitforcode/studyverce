-- Fix infinite recursion between study_rooms and room_members RLS policies.
-- Use SECURITY DEFINER helpers so policy checks don't re-enter RLS on related tables.

CREATE OR REPLACE FUNCTION public.is_room_member(p_room_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = p_room_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_room_owner(p_room_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.study_rooms
    WHERE id = p_room_id AND owner_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_room(p_room_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.study_rooms sr
    WHERE sr.id = p_room_id
      AND (
        sr.is_public = TRUE
        OR sr.owner_id = p_user_id
        OR EXISTS (
          SELECT 1 FROM public.room_members rm
          WHERE rm.room_id = p_room_id AND rm.user_id = p_user_id
        )
      )
  );
$$;

-- study_rooms
DROP POLICY IF EXISTS "Public rooms are viewable by everyone" ON public.study_rooms;
CREATE POLICY "Public rooms are viewable by everyone"
  ON public.study_rooms FOR SELECT
  USING (
    is_public = TRUE
    OR owner_id = auth.uid()
    OR public.is_room_member(id)
  );

-- room_members
DROP POLICY IF EXISTS "Members can view room membership" ON public.room_members;
CREATE POLICY "Members can view room membership"
  ON public.room_members FOR SELECT
  USING (public.can_access_room(room_id));

DROP POLICY IF EXISTS "Users can leave rooms" ON public.room_members;
CREATE POLICY "Users can leave rooms"
  ON public.room_members FOR DELETE
  USING (auth.uid() = user_id OR public.is_room_owner(room_id));

-- room_messages
DROP POLICY IF EXISTS "Room members can view messages" ON public.room_messages;
CREATE POLICY "Room members can view messages"
  ON public.room_messages FOR SELECT
  USING (public.can_access_room(room_id));

DROP POLICY IF EXISTS "Room members can send messages" ON public.room_messages;
CREATE POLICY "Room members can send messages"
  ON public.room_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND public.is_room_member(room_id)
  );

DROP POLICY IF EXISTS "Owners and moderators can delete messages" ON public.room_messages;
CREATE POLICY "Owners and moderators can delete messages"
  ON public.room_messages FOR DELETE
  USING (
    auth.uid() = user_id
    OR public.is_room_owner(room_id)
    OR EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = room_messages.room_id
        AND rm.user_id = auth.uid()
        AND rm.role IN ('owner', 'moderator')
    )
  );

-- Allow users to insert their own profile (fallback if auth trigger missed)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
