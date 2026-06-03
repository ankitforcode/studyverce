-- Per-user OAuth tokens for streaming providers (Spotify, YouTube Music, Apple Music)

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

CREATE INDEX IF NOT EXISTS idx_user_music_connections_user
  ON public.user_music_connections(user_id);

ALTER TABLE public.user_music_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own music connections"
  ON public.user_music_connections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.user_music_connections IS 'OAuth tokens for Spotify, YouTube Music (Google), and Apple Music';
