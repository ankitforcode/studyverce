-- StudyVerce initial schema

-- Profiles (extends auth.users)
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON public.profiles(username);

-- Study rooms
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_study_rooms_slug ON public.study_rooms(slug);
CREATE INDEX idx_study_rooms_public ON public.study_rooms(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_study_rooms_owner ON public.study_rooms(owner_id);

-- Room members
CREATE TABLE IF NOT EXISTS public.room_members (
  room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX idx_room_members_user ON public.room_members(user_id);

-- Study sessions
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

-- Room messages
CREATE TABLE IF NOT EXISTS public.room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_room_messages_room ON public.room_messages(room_id, created_at DESC);

-- Achievements (Phase 2 scaffold)
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

-- Auto-create profile on signup
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS helper functions (SECURITY DEFINER avoids policy recursion)
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

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Study rooms policies
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

-- Room members policies
CREATE POLICY "Members can view room membership"
  ON public.room_members FOR SELECT
  USING (public.can_access_room(room_id));

CREATE POLICY "Users can join rooms"
  ON public.room_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms"
  ON public.room_members FOR DELETE
  USING (auth.uid() = user_id OR public.is_room_owner(room_id));

-- Study sessions policies
CREATE POLICY "Users can view own sessions"
  ON public.study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON public.study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.study_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Room messages policies
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

-- Achievements policies
CREATE POLICY "Achievements are viewable by everyone"
  ON public.achievements FOR SELECT USING (true);

CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

-- Seed achievements
INSERT INTO public.achievements (slug, name, description, icon) VALUES
  ('first_session', 'First Focus', 'Complete your first study session', 'star'),
  ('streak_7', 'Week Warrior', 'Maintain a 7-day study streak', 'flame'),
  ('streak_30', 'Monthly Master', 'Maintain a 30-day study streak', 'crown'),
  ('hours_10', 'Deep Focus', 'Accumulate 10 hours of focus time', 'clock'),
  ('hours_100', 'Century Scholar', 'Accumulate 100 hours of focus time', 'book')
ON CONFLICT (slug) DO NOTHING;

-- Function to update streak and total focus minutes
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
