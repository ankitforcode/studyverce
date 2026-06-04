-- StudyVerce database seed
-- Runs on `supabase db reset` and first `supabase start` (see supabase/config.toml [db.seed]).
--
-- Schema lives in supabase/migrations/*.sql (DDL + RLS only).
-- Reference data (storage buckets, achievements, built-in wallpapers/tracks, admin user) lives here.
--
-- Sign in at http://localhost:3001/auth/login
--   Email:    admin@studyverce.local
--   Password: StudyVerceAdmin123!

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Achievements
-- ---------------------------------------------------------------------------
INSERT INTO public.achievements (slug, name, description, icon) VALUES
  ('first_session', 'First Focus', 'Complete your first study session', 'star'),
  ('streak_7', 'Week Warrior', 'Maintain a 7-day study streak', 'flame'),
  ('streak_30', 'Monthly Master', 'Maintain a 30-day study streak', 'crown'),
  ('hours_10', 'Deep Focus', 'Accumulate 10 hours of focus time', 'clock'),
  ('hours_100', 'Century Scholar', 'Accumulate 100 hours of focus time', 'book')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Built-in wallpapers (stable IDs; Unsplash URLs verified)
-- ---------------------------------------------------------------------------
INSERT INTO public.room_wallpapers (id, name, image_url, is_builtin, is_public, category) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'Mountain Dawn', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2400&q=85', TRUE, TRUE, 'nature'),
  ('b0000000-0000-4000-8000-000000000002', 'Forest Path', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=2400&q=85', TRUE, TRUE, 'nature'),
  ('b0000000-0000-4000-8000-000000000003', 'Ocean Horizon', 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=2400&q=85', TRUE, TRUE, 'nature'),
  ('b0000000-0000-4000-8000-000000000004', 'Starry Night', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=2400&q=85', TRUE, TRUE, 'space'),
  ('b0000000-0000-4000-8000-000000000005', 'Deep Space', 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=2400&q=85', TRUE, TRUE, 'space'),
  ('b0000000-0000-4000-8000-000000000006', 'Cozy Library', 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=2400&q=85', TRUE, TRUE, 'study'),
  ('b0000000-0000-4000-8000-000000000007', 'Minimal Desk', 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=2400&q=85', TRUE, TRUE, 'study'),
  ('b0000000-0000-4000-8000-000000000008', 'City Night', 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=2400&q=85', TRUE, TRUE, 'urban'),
  ('b0000000-0000-4000-8000-000000000009', 'Rainy Window', 'https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?w=2400&q=85', TRUE, TRUE, 'ambient'),
  ('b0000000-0000-4000-8000-000000000010', 'Cherry Blossoms', 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=2400&q=85', TRUE, TRUE, 'nature'),
  ('b0000000-0000-4000-8000-000000000011', 'Northern Lights', 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=2400&q=85', TRUE, TRUE, 'nature'),
  ('b0000000-0000-4000-8000-000000000012', 'Abstract Gradient', 'https://images.unsplash.com/photo-1557683316-973673baf926?w=2400&q=85', TRUE, TRUE, 'minimal')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  image_url = EXCLUDED.image_url,
  is_builtin = EXCLUDED.is_builtin,
  is_public = EXCLUDED.is_public,
  category = EXCLUDED.category;

-- Legacy rows (random UUIDs from older seeds): fix broken URLs by name
UPDATE public.room_wallpapers
SET image_url = 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=2400&q=85'
WHERE is_builtin = TRUE AND name = 'Starry Night';

UPDATE public.room_wallpapers
SET image_url = 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=2400&q=85'
WHERE is_builtin = TRUE AND name = 'City Night';

-- ---------------------------------------------------------------------------
-- Built-in focus tracks
-- ---------------------------------------------------------------------------
INSERT INTO public.room_tracks (
  id,
  name,
  artist,
  audio_url,
  is_builtin,
  is_public,
  category,
  duration_seconds,
  provider
) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'Calm Focus', 'StudyVerce', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', TRUE, TRUE, 'focus', 372, 'builtin'),
  ('c0000000-0000-4000-8000-000000000002', 'Deep Work', 'StudyVerce', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', TRUE, TRUE, 'focus', 425, 'builtin'),
  ('c0000000-0000-4000-8000-000000000003', 'Ambient Flow', 'StudyVerce', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', TRUE, TRUE, 'ambient', 390, 'builtin'),
  ('c0000000-0000-4000-8000-000000000004', 'Lo-Fi Study', 'StudyVerce', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', TRUE, TRUE, 'lofi', 410, 'builtin'),
  ('c0000000-0000-4000-8000-000000000005', 'Rainy Day', 'StudyVerce', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', TRUE, TRUE, 'nature', 355, 'builtin'),
  ('c0000000-0000-4000-8000-000000000006', 'Night Library', 'StudyVerce', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', TRUE, TRUE, 'study', 380, 'builtin'),
  ('c0000000-0000-4000-8000-000000000007', 'Soft Piano', 'StudyVerce', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', TRUE, TRUE, 'classical', 400, 'builtin'),
  ('c0000000-0000-4000-8000-000000000008', 'Gentle Waves', 'StudyVerce', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', TRUE, TRUE, 'nature', 365, 'builtin')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  artist = EXCLUDED.artist,
  audio_url = EXCLUDED.audio_url,
  is_builtin = EXCLUDED.is_builtin,
  is_public = EXCLUDED.is_public,
  category = EXCLUDED.category,
  duration_seconds = EXCLUDED.duration_seconds,
  provider = EXCLUDED.provider;

UPDATE public.room_tracks
SET provider = 'builtin'
WHERE is_builtin = TRUE AND (provider IS NULL OR provider = 'direct');

-- ---------------------------------------------------------------------------
-- Local admin user
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  admin_id UUID := 'a0000000-0000-4000-8000-000000000001';
  admin_email TEXT := 'admin@studyverce.local';
  instance UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    phone,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    is_anonymous,
    is_super_admin
  ) VALUES (
    instance,
    admin_id,
    'authenticated',
    'authenticated',
    admin_email,
    extensions.crypt('StudyVerceAdmin123!', extensions.gen_salt('bf')),
    NOW(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'admin'),
    jsonb_build_object('full_name', 'StudyVerce Admin'),
    NOW(),
    NOW(),
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    '',
    NULL,
    false,
    false,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    is_super_admin = EXCLUDED.is_super_admin,
    updated_at = NOW();

  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    admin_id,
    admin_id::text,
    admin_id,
    jsonb_build_object(
      'sub', admin_id::text,
      'email', admin_email,
      'email_verified', true,
      'provider', 'email'
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (provider_id, provider) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = NOW();

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    study_streak,
    total_focus_minutes,
    subject_tags,
    plan_tier,
    onboarding_completed,
    is_admin
  ) VALUES (
    admin_id,
    'admin',
    'StudyVerce Admin',
    0,
    0,
    ARRAY['general']::text[],
    'institution',
    true,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    plan_tier = EXCLUDED.plan_tier,
    onboarding_completed = EXCLUDED.onboarding_completed,
    is_admin = EXCLUDED.is_admin,
    updated_at = NOW();
END $$;
