-- External music providers (SoundCloud, YouTube, Spotify) instead of file uploads

ALTER TABLE public.room_tracks
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT;

CREATE INDEX IF NOT EXISTS idx_room_tracks_provider ON public.room_tracks(provider);

UPDATE public.room_tracks
SET provider = 'builtin'
WHERE is_builtin = TRUE AND provider = 'direct';

COMMENT ON COLUMN public.room_tracks.provider IS 'builtin | youtube | soundcloud | spotify | direct';
COMMENT ON COLUMN public.room_tracks.source_url IS 'Original provider URL pasted by user';
COMMENT ON COLUMN public.room_tracks.audio_url IS 'Direct stream URL or embed player URL';
