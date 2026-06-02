-- Personal post-it tasks for dashboard (created when joining rooms)

CREATE TABLE IF NOT EXISTS public.user_post_it_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.study_rooms(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  title_done BOOLEAN NOT NULL DEFAULT FALSE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  pos_x REAL NOT NULL DEFAULT 40,
  pos_y REAL NOT NULL DEFAULT 40,
  color TEXT NOT NULL DEFAULT 'yellow' CHECK (color IN ('yellow', 'mint', 'pink', 'sky', 'lavender')),
  z_index INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_post_it_tasks_user ON public.user_post_it_tasks(user_id);
CREATE INDEX idx_user_post_it_tasks_room ON public.user_post_it_tasks(user_id, room_id);

DROP TRIGGER IF EXISTS user_post_it_tasks_updated_at ON public.user_post_it_tasks;
CREATE TRIGGER user_post_it_tasks_updated_at
  BEFORE UPDATE ON public.user_post_it_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_post_it_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own post-it tasks"
  ON public.user_post_it_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own post-it tasks"
  ON public.user_post_it_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own post-it tasks"
  ON public.user_post_it_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own post-it tasks"
  ON public.user_post_it_tasks FOR DELETE
  USING (auth.uid() = user_id);
