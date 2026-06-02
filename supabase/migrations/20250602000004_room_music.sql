-- Room music: built-in library, user uploads, community sharing, owner approval

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_room_tracks_public ON public.room_tracks(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_room_tracks_builtin ON public.room_tracks(is_builtin) WHERE is_builtin = TRUE;
CREATE INDEX idx_room_tracks_uploaded_by ON public.room_tracks(uploaded_by);

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

ALTER TABLE public.study_rooms
  ADD COLUMN IF NOT EXISTS track_id UUID REFERENCES public.room_tracks(id) ON DELETE SET NULL;

-- Storage bucket for user-uploaded tracks
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'room-music',
  'room-music',
  TRUE,
  20971520,
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS: room_tracks
ALTER TABLE public.room_tracks ENABLE ROW LEVEL SECURITY;

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

-- RLS: room_track_requests
ALTER TABLE public.room_track_requests ENABLE ROW LEVEL SECURITY;

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

-- Storage policies for room-music bucket
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

-- Built-in ambient/focus tracks (royalty-free demo URLs)
INSERT INTO public.room_tracks (name, artist, audio_url, is_builtin, is_public, category, duration_seconds) VALUES
  ('Calm Focus', 'StudyVerse', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', TRUE, TRUE, 'focus', 372),
  ('Deep Work', 'StudyVerse', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', TRUE, TRUE, 'focus', 425),
  ('Ambient Flow', 'StudyVerse', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', TRUE, TRUE, 'ambient', 390),
  ('Lo-Fi Study', 'StudyVerse', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', TRUE, TRUE, 'lofi', 410),
  ('Rainy Day', 'StudyVerse', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', TRUE, TRUE, 'nature', 355),
  ('Night Library', 'StudyVerse', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', TRUE, TRUE, 'study', 380),
  ('Soft Piano', 'StudyVerse', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', TRUE, TRUE, 'classical', 400),
  ('Gentle Waves', 'StudyVerse', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', TRUE, TRUE, 'nature', 365);
