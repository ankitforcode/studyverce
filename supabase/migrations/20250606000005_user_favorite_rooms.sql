-- User-saved favorite study rooms.

CREATE TABLE IF NOT EXISTS public.user_favorite_rooms (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorite_rooms_user
  ON public.user_favorite_rooms(user_id);

ALTER TABLE public.user_favorite_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON public.user_favorite_rooms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add own favorites"
  ON public.user_favorite_rooms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own favorites"
  ON public.user_favorite_rooms FOR DELETE
  USING (auth.uid() = user_id);
