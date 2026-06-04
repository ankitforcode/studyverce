-- StudyVerce consolidated schema (DDL + RLS)
-- Reference data: supabase/seed.sql

-- =============================================================================
-- Core tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  study_streak INTEGER NOT NULL DEFAULT 0,
  total_focus_minutes INTEGER NOT NULL DEFAULT 0,
  subject_tags TEXT[] NOT NULL DEFAULT '{}',
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'premium', 'institution')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_is_admin ON public.profiles (is_admin) WHERE is_admin = TRUE;

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'trophy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS public.room_wallpapers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  thumbnail_url TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_room_wallpapers_public ON public.room_wallpapers(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_room_wallpapers_builtin ON public.room_wallpapers(is_builtin) WHERE is_builtin = TRUE;
CREATE INDEX idx_room_wallpapers_uploaded_by ON public.room_wallpapers(uploaded_by);

CREATE TABLE IF NOT EXISTS public.room_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  artist TEXT,
  audio_url TEXT NOT NULL,
  storage_path TEXT,
  cover_url TEXT,
  duration_seconds INTEGER,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
  category TEXT NOT NULL DEFAULT 'ambient',
  provider TEXT NOT NULL DEFAULT 'direct',
  external_id TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_room_tracks_public ON public.room_tracks(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_room_tracks_builtin ON public.room_tracks(is_builtin) WHERE is_builtin = TRUE;
CREATE INDEX idx_room_tracks_uploaded_by ON public.room_tracks(uploaded_by);
CREATE INDEX idx_room_tracks_provider ON public.room_tracks(provider);

COMMENT ON COLUMN public.room_tracks.provider IS 'builtin | youtube | soundcloud | spotify | direct';
COMMENT ON COLUMN public.room_tracks.source_url IS 'Original provider URL pasted by user';
COMMENT ON COLUMN public.room_tracks.audio_url IS 'Direct stream URL or embed player URL';

CREATE TABLE IF NOT EXISTS public.study_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_participants INTEGER NOT NULL DEFAULT 50,
  settings JSONB NOT NULL DEFAULT '{"videoEnabled": false, "pomodoroDefaults": {"focusMinutes": 25, "breakMinutes": 5}, "anyoneCanControlTimer": true}',
  invite_token TEXT UNIQUE,
  wallpaper_id UUID REFERENCES public.room_wallpapers(id) ON DELETE SET NULL,
  track_id UUID REFERENCES public.room_tracks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_study_rooms_slug ON public.study_rooms(slug);
CREATE INDEX idx_study_rooms_public ON public.study_rooms(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_study_rooms_owner ON public.study_rooms(owner_id);

CREATE TABLE IF NOT EXISTS public.room_members (
  room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX idx_room_members_user ON public.room_members(user_id);

CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.study_rooms(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  focus_minutes INTEGER NOT NULL DEFAULT 0,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  goal_text TEXT,
  subjects TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_study_sessions_user ON public.study_sessions(user_id);
CREATE INDEX idx_study_sessions_started ON public.study_sessions(started_at);
CREATE INDEX idx_study_sessions_room ON public.study_sessions(room_id);

CREATE TABLE IF NOT EXISTS public.room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_room_messages_room ON public.room_messages(room_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.room_track_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.room_tracks(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_room_track_requests_pending
  ON public.room_track_requests(room_id, track_id)
  WHERE status = 'pending';

CREATE INDEX idx_room_track_requests_room ON public.room_track_requests(room_id);
CREATE INDEX idx_room_track_requests_status ON public.room_track_requests(status);

-- Phase 2 scaffold
CREATE TABLE IF NOT EXISTS public.friendships (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  target_minutes INTEGER NOT NULL DEFAULT 300,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_post_it_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.study_rooms(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  title_done BOOLEAN NOT NULL DEFAULT FALSE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  pos_x REAL NOT NULL DEFAULT 40,
  pos_y REAL NOT NULL DEFAULT 40,
  width REAL NOT NULL DEFAULT 200,
  height REAL NOT NULL DEFAULT 200,
  color TEXT NOT NULL DEFAULT 'yellow' CHECK (color IN ('yellow', 'mint', 'pink', 'sky', 'lavender')),
  z_index INTEGER NOT NULL DEFAULT 1,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  closed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_post_it_tasks_user ON public.user_post_it_tasks(user_id);
CREATE INDEX idx_user_post_it_tasks_room ON public.user_post_it_tasks(user_id, room_id);

CREATE TABLE IF NOT EXISTS public.user_music_connections (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('spotify', 'youtube_music', 'apple_music')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  scope TEXT,
  provider_account_id TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, provider)
);

CREATE INDEX idx_user_music_connections_user ON public.user_music_connections(user_id);

COMMENT ON TABLE public.user_music_connections IS 'OAuth tokens for Spotify, YouTube Music (Google), and Apple Music';

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

CREATE INDEX idx_user_room_sidebar_layout_room ON public.user_room_sidebar_layout(room_id);

-- =============================================================================
-- Functions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION public.update_profile_stats(p_user_id UUID, p_focus_minutes INTEGER)
RETURNS VOID AS $$
DECLARE
  last_session_date DATE;
  today DATE := CURRENT_DATE;
  current_streak INTEGER;
BEGIN
  SELECT study_streak INTO current_streak FROM public.profiles WHERE id = p_user_id;

  SELECT DATE(started_at) INTO last_session_date
  FROM public.study_sessions
  WHERE user_id = p_user_id AND focus_minutes > 0
  ORDER BY started_at DESC
  LIMIT 1 OFFSET 1;

  UPDATE public.profiles
  SET
    total_focus_minutes = total_focus_minutes + p_focus_minutes,
    study_streak = CASE
      WHEN last_session_date = today - 1 THEN current_streak + 1
      WHEN last_session_date = today THEN current_streak
      ELSE 1
    END,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.leaderboard_weekly_focus(p_limit integer DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  weekly_minutes bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.user_id,
    COALESCE(SUM(s.focus_minutes), 0)::bigint AS weekly_minutes
  FROM public.study_sessions s
  WHERE s.focus_minutes > 0
    AND s.started_at >= date_trunc('week', timezone('utc', now()))
  GROUP BY s.user_id
  HAVING SUM(s.focus_minutes) > 0
  ORDER BY weekly_minutes DESC
  LIMIT GREATEST(COALESCE(p_limit, 50), 1);
$$;

REVOKE ALL ON FUNCTION public.leaderboard_weekly_focus(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leaderboard_weekly_focus(integer) TO anon, authenticated;

-- =============================================================================
-- Triggers
-- =============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS user_post_it_tasks_updated_at ON public.user_post_it_tasks;
CREATE TRIGGER user_post_it_tasks_updated_at
  BEFORE UPDATE ON public.user_post_it_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS user_room_sidebar_layout_updated_at ON public.user_room_sidebar_layout;
CREATE TRIGGER user_room_sidebar_layout_updated_at
  BEFORE UPDATE ON public.user_room_sidebar_layout
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- Row level security
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_wallpapers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_track_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_post_it_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_music_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_room_sidebar_layout ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Study rooms
CREATE POLICY "Public rooms are viewable by everyone"
  ON public.study_rooms FOR SELECT
  USING (
    is_public = TRUE
    OR owner_id = auth.uid()
    OR public.is_room_member(id)
  );

CREATE POLICY "Authenticated users can create rooms"
  ON public.study_rooms FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their rooms"
  ON public.study_rooms FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their rooms"
  ON public.study_rooms FOR DELETE
  USING (auth.uid() = owner_id);

-- Room members
CREATE POLICY "Members can view room membership"
  ON public.room_members FOR SELECT
  USING (public.can_access_room(room_id));

CREATE POLICY "Users can join rooms"
  ON public.room_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms"
  ON public.room_members FOR DELETE
  USING (auth.uid() = user_id OR public.is_room_owner(room_id));

-- Study sessions
CREATE POLICY "Users can view own sessions"
  ON public.study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON public.study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.study_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Room messages
CREATE POLICY "Room members can view messages"
  ON public.room_messages FOR SELECT
  USING (public.can_access_room(room_id));

CREATE POLICY "Room members can send messages"
  ON public.room_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_room_member(room_id));

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

-- Achievements
CREATE POLICY "Achievements are viewable by everyone"
  ON public.achievements FOR SELECT USING (true);

CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

-- Wallpapers
CREATE POLICY "Wallpapers viewable if builtin, public, or own"
  ON public.room_wallpapers FOR SELECT
  USING (
    is_builtin = TRUE
    OR is_public = TRUE
    OR uploaded_by = auth.uid()
  );

CREATE POLICY "Users can upload wallpapers"
  ON public.room_wallpapers FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by AND is_builtin = FALSE);

CREATE POLICY "Users can update own wallpapers"
  ON public.room_wallpapers FOR UPDATE
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete own wallpapers"
  ON public.room_wallpapers FOR DELETE
  USING (auth.uid() = uploaded_by AND is_builtin = FALSE);

CREATE POLICY "Room wallpaper files are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'room-wallpapers');

CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'room-wallpapers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own wallpaper files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'room-wallpapers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own wallpaper files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'room-wallpapers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Tracks
CREATE POLICY "Tracks viewable if builtin, public, or own"
  ON public.room_tracks FOR SELECT
  USING (
    is_builtin = TRUE
    OR is_public = TRUE
    OR uploaded_by = auth.uid()
  );

CREATE POLICY "Users can upload tracks"
  ON public.room_tracks FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by AND is_builtin = FALSE);

CREATE POLICY "Users can update own tracks"
  ON public.room_tracks FOR UPDATE
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete own tracks"
  ON public.room_tracks FOR DELETE
  USING (auth.uid() = uploaded_by AND is_builtin = FALSE);

-- Track requests
CREATE POLICY "Room members can view track requests"
  ON public.room_track_requests FOR SELECT
  USING (
    public.is_room_member(room_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.study_rooms sr
      WHERE sr.id = room_id AND sr.owner_id = auth.uid()
    )
  );

CREATE POLICY "Room members can request tracks"
  ON public.room_track_requests FOR INSERT
  WITH CHECK (
    auth.uid() = requested_by
    AND status = 'pending'
    AND (
      public.is_room_member(room_id, auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.study_rooms sr
        WHERE sr.id = room_id AND sr.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Room owners can review track requests"
  ON public.room_track_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.study_rooms sr
      WHERE sr.id = room_id AND sr.owner_id = auth.uid()
    )
  );

CREATE POLICY "Room music files are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'room-music');

CREATE POLICY "Users can upload music to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'room-music'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own music files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'room-music'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own music files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'room-music'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Post-it tasks
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

-- Music connections
CREATE POLICY "Users manage own music connections"
  ON public.user_music_connections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sidebar layout
CREATE POLICY "Users can view own room sidebar layout"
  ON public.user_room_sidebar_layout FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own room sidebar layout"
  ON public.user_room_sidebar_layout FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own room sidebar layout"
  ON public.user_room_sidebar_layout FOR UPDATE
  USING (auth.uid() = user_id);
