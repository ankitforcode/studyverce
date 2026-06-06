-- Admin RLS: let is_admin profiles list and manage all users and rooms via the
-- authenticated Supabase client (no service role required for reads/writes).

CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = p_user_id),
    false
  );
$$;

CREATE POLICY "Admins can view all rooms"
  ON public.study_rooms FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "Admins can update any room"
  ON public.study_rooms FOR UPDATE
  USING (public.is_admin_user());

CREATE POLICY "Admins can delete any room"
  ON public.study_rooms FOR DELETE
  USING (public.is_admin_user());

CREATE POLICY "Admins can view all room members"
  ON public.room_members FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin_user());
