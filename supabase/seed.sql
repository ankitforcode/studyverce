-- Local development seed: admin user
-- Runs on `supabase db reset` and first `supabase start` (see supabase/config.toml [db.seed]).
--
-- Sign in at http://localhost:3001/auth/login
--   Email:    admin@studyverce.local
--   Password: StudyVerceAdmin123!

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

  -- handle_new_user trigger creates a profile row; align it with admin settings
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
