-- Room wallpapers: built-in library, user uploads, and community sharing

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

ALTER TABLE public.study_rooms
  ADD COLUMN IF NOT EXISTS wallpaper_id UUID REFERENCES public.room_wallpapers(id) ON DELETE SET NULL;

-- Storage bucket for user-uploaded wallpapers
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'room-wallpapers',
  'room-wallpapers',
  TRUE,
  15728640,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS: room_wallpapers
ALTER TABLE public.room_wallpapers ENABLE ROW LEVEL SECURITY;

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

-- Storage policies
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

-- Built-in wallpaper library (Unsplash, free to use)
INSERT INTO public.room_wallpapers (name, image_url, is_builtin, is_public, category) VALUES
  ('Mountain Dawn', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2400&q=85', TRUE, TRUE, 'nature'),
  ('Forest Path', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=2400&q=85', TRUE, TRUE, 'nature'),
  ('Ocean Horizon', 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=2400&q=85', TRUE, TRUE, 'nature'),
  ('Starry Night', 'https://images.unsplash.com/photo-1419242902214-272b4f66e147?w=2400&q=85', TRUE, TRUE, 'space'),
  ('Deep Space', 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=2400&q=85', TRUE, TRUE, 'space'),
  ('Cozy Library', 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=2400&q=85', TRUE, TRUE, 'study'),
  ('Minimal Desk', 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=2400&q=85', TRUE, TRUE, 'study'),
  ('City Night', 'https://images.unsplash.com/photo-1514565131-fce0801dec32?w=2400&q=85', TRUE, TRUE, 'urban'),
  ('Rainy Window', 'https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?w=2400&q=85', TRUE, TRUE, 'ambient'),
  ('Cherry Blossoms', 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=2400&q=85', TRUE, TRUE, 'nature'),
  ('Northern Lights', 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=2400&q=85', TRUE, TRUE, 'nature'),
  ('Abstract Gradient', 'https://images.unsplash.com/photo-1557683316-973673baf926?w=2400&q=85', TRUE, TRUE, 'minimal');
