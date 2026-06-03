-- Per-user sidebar panel order inside a study room

CREATE TABLE IF NOT EXISTS public.user_room_sidebar_layout (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  panel_order TEXT[] NOT NULL DEFAULT ARRAY['tasks', 'assistant', 'chat']::TEXT[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, room_id),
  CONSTRAINT user_room_sidebar_layout_panel_order_check CHECK (
    array_length(panel_order, 1) = 3
    AND panel_order <@ ARRAY['tasks', 'assistant', 'chat']::TEXT[]
    AND panel_order @> ARRAY['tasks', 'assistant', 'chat']::TEXT[]
  )
);

CREATE INDEX idx_user_room_sidebar_layout_room
  ON public.user_room_sidebar_layout(room_id);

DROP TRIGGER IF EXISTS user_room_sidebar_layout_updated_at ON public.user_room_sidebar_layout;
CREATE TRIGGER user_room_sidebar_layout_updated_at
  BEFORE UPDATE ON public.user_room_sidebar_layout
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_room_sidebar_layout ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own room sidebar layout"
  ON public.user_room_sidebar_layout FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own room sidebar layout"
  ON public.user_room_sidebar_layout FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own room sidebar layout"
  ON public.user_room_sidebar_layout FOR UPDATE
  USING (auth.uid() = user_id);
