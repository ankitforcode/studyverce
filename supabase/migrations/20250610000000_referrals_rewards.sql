-- Referral & rewards program: profile entitlements, referrals, milestone grants, study achievements.

-- =============================================================================
-- Profile columns
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS premium_source TEXT NOT NULL DEFAULT 'free'
    CHECK (premium_source IN ('free', 'referral_trial', 'referral_reward', 'referral_lifetime', 'stripe', 'admin'));

UPDATE public.profiles
SET referral_code = username
WHERE referral_code IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN referral_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code
  ON public.profiles (LOWER(referral_code));

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by
  ON public.profiles (referred_by_user_id)
  WHERE referred_by_user_id IS NOT NULL;

-- =============================================================================
-- Referrals & reward ledger
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'qualified', 'rejected')),
  qualified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referrals_no_self CHECK (referrer_id <> referee_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_status
  ON public.referrals (referrer_id, status);

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL
    CHECK (reward_type IN ('referee_trial', 'premium_1mo', 'ambassador_badge', 'lifetime_premium')),
  referral_count_at_grant INTEGER NOT NULL DEFAULT 0,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, reward_type)
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_user
  ON public.referral_rewards (user_id);

-- Ambassador achievement
INSERT INTO public.achievements (slug, name, description, icon)
VALUES (
  'referrals_10',
  'Ambassador',
  'Invited 10 friends who joined StudyVerce',
  'users-star'
)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- Block self-elevation of referral / premium columns
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_admin_user() THEN
    RETURN NEW;
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Cannot change is_admin';
  END IF;

  IF NEW.plan_tier IS DISTINCT FROM OLD.plan_tier THEN
    RAISE EXCEPTION 'Cannot change plan_tier';
  END IF;

  IF NEW.total_focus_minutes IS DISTINCT FROM OLD.total_focus_minutes THEN
    RAISE EXCEPTION 'Cannot change total_focus_minutes';
  END IF;

  IF NEW.study_streak IS DISTINCT FROM OLD.study_streak THEN
    RAISE EXCEPTION 'Cannot change study_streak';
  END IF;

  IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
    RAISE EXCEPTION 'Cannot change referral_code';
  END IF;

  IF NEW.referred_by_user_id IS DISTINCT FROM OLD.referred_by_user_id THEN
    RAISE EXCEPTION 'Cannot change referred_by_user_id';
  END IF;

  IF NEW.premium_until IS DISTINCT FROM OLD.premium_until THEN
    RAISE EXCEPTION 'Cannot change premium_until';
  END IF;

  IF NEW.premium_source IS DISTINCT FROM OLD.premium_source THEN
    RAISE EXCEPTION 'Cannot change premium_source';
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- Referral helpers
-- =============================================================================

CREATE OR REPLACE FUNCTION public.grant_achievement_by_slug(p_user_id UUID, p_slug TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement_id UUID;
BEGIN
  SELECT id INTO v_achievement_id
  FROM public.achievements
  WHERE slug = p_slug;

  IF v_achievement_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.user_achievements (user_id, achievement_id)
  VALUES (p_user_id, v_achievement_id)
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_referral(p_referee_id UUID, p_referral_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_normalized TEXT;
BEGIN
  v_normalized := lower(trim(p_referral_code));
  IF v_normalized = '' THEN
    RETURN FALSE;
  END IF;

  SELECT id INTO v_referrer_id
  FROM public.profiles
  WHERE lower(referral_code) = v_normalized
  LIMIT 1;

  IF v_referrer_id IS NULL OR v_referrer_id = p_referee_id THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (SELECT 1 FROM public.referrals WHERE referee_id = p_referee_id) THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.referrals (referrer_id, referee_id, status)
  VALUES (v_referrer_id, p_referee_id, 'pending');

  UPDATE public.profiles
  SET referred_by_user_id = v_referrer_id
  WHERE id = p_referee_id
    AND referred_by_user_id IS NULL;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_referral_code_for_username(p_user_id UUID, p_username TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET referral_code = lower(trim(p_username))
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.evaluate_referrer_rewards(p_referrer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_premium_source TEXT;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.referrals
  WHERE referrer_id = p_referrer_id
    AND status = 'qualified';

  SELECT premium_source INTO v_premium_source
  FROM public.profiles
  WHERE id = p_referrer_id;

  IF v_count >= 3
     AND v_premium_source IS DISTINCT FROM 'referral_lifetime'
     AND NOT EXISTS (
       SELECT 1 FROM public.referral_rewards
       WHERE user_id = p_referrer_id AND reward_type = 'premium_1mo'
     ) THEN
    UPDATE public.profiles
    SET
      premium_until = GREATEST(COALESCE(premium_until, NOW()), NOW()) + INTERVAL '30 days',
      premium_source = CASE
        WHEN premium_source IN ('referral_lifetime', 'admin', 'stripe') THEN premium_source
        ELSE 'referral_reward'
      END
    WHERE id = p_referrer_id;

    INSERT INTO public.referral_rewards (user_id, reward_type, referral_count_at_grant)
    VALUES (p_referrer_id, 'premium_1mo', v_count)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_count >= 10
     AND NOT EXISTS (
       SELECT 1 FROM public.referral_rewards
       WHERE user_id = p_referrer_id AND reward_type = 'ambassador_badge'
     ) THEN
    PERFORM public.grant_achievement_by_slug(p_referrer_id, 'referrals_10');

    INSERT INTO public.referral_rewards (user_id, reward_type, referral_count_at_grant)
    VALUES (p_referrer_id, 'ambassador_badge', v_count)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_count >= 25
     AND NOT EXISTS (
       SELECT 1 FROM public.referral_rewards
       WHERE user_id = p_referrer_id AND reward_type = 'lifetime_premium'
     ) THEN
    UPDATE public.profiles
    SET
      premium_source = 'referral_lifetime',
      premium_until = NULL
    WHERE id = p_referrer_id;

    INSERT INTO public.referral_rewards (user_id, reward_type, referral_count_at_grant)
    VALUES (p_referrer_id, 'lifetime_premium', v_count)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.qualify_referral_and_grant_rewards(p_referee_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_id UUID;
  v_result JSONB := '{}'::JSONB;
BEGIN
  SELECT id, referrer_id INTO v_referral_id, v_referrer_id
  FROM public.referrals
  WHERE referee_id = p_referee_id
    AND status = 'pending'
  LIMIT 1;

  IF v_referral_id IS NULL THEN
    RETURN jsonb_build_object('qualified', false);
  END IF;

  UPDATE public.referrals
  SET status = 'qualified', qualified_at = NOW()
  WHERE id = v_referral_id;

  -- Referee 7-day Premium trial
  IF NOT EXISTS (
    SELECT 1 FROM public.referral_rewards
    WHERE user_id = p_referee_id AND reward_type = 'referee_trial'
  ) THEN
    UPDATE public.profiles
    SET
      premium_until = GREATEST(COALESCE(premium_until, NOW()), NOW()) + INTERVAL '7 days',
      premium_source = CASE
        WHEN premium_source IN ('referral_lifetime', 'admin', 'stripe') THEN premium_source
        WHEN plan_tier = 'premium' THEN premium_source
        ELSE 'referral_trial'
      END
    WHERE id = p_referee_id
      AND premium_source IS DISTINCT FROM 'referral_lifetime';

    INSERT INTO public.referral_rewards (user_id, reward_type, referral_count_at_grant)
    VALUES (p_referee_id, 'referee_trial', 1)
    ON CONFLICT DO NOTHING;
  END IF;

  PERFORM public.evaluate_referrer_rewards(v_referrer_id);

  RETURN jsonb_build_object(
    'qualified', true,
    'referrer_id', v_referrer_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_study_achievements(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak INTEGER;
  v_minutes INTEGER;
  v_session_count INTEGER;
BEGIN
  SELECT study_streak, total_focus_minutes
  INTO v_streak, v_minutes
  FROM public.profiles
  WHERE id = p_user_id;

  SELECT COUNT(*)::INTEGER INTO v_session_count
  FROM public.study_sessions
  WHERE user_id = p_user_id
    AND focus_minutes > 0;

  IF v_session_count >= 1 THEN
    PERFORM public.grant_achievement_by_slug(p_user_id, 'first_session');
  END IF;

  IF v_streak >= 7 THEN
    PERFORM public.grant_achievement_by_slug(p_user_id, 'streak_7');
  END IF;

  IF v_streak >= 30 THEN
    PERFORM public.grant_achievement_by_slug(p_user_id, 'streak_30');
  END IF;

  IF v_minutes >= 600 THEN
    PERFORM public.grant_achievement_by_slug(p_user_id, 'hours_10');
  END IF;

  IF v_minutes >= 6000 THEN
    PERFORM public.grant_achievement_by_slug(p_user_id, 'hours_100');
  END IF;
END;
$$;

-- =============================================================================
-- Updated triggers / stats
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code TEXT;
  v_ref_code TEXT;
BEGIN
  v_referral_code := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8);

  INSERT INTO public.profiles (id, username, display_name, referral_code, premium_source)
  VALUES (
    NEW.id,
    v_referral_code,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    v_referral_code,
    'free'
  );

  v_ref_code := NEW.raw_user_meta_data->>'referral_code';
  IF v_ref_code IS NOT NULL AND trim(v_ref_code) <> '' THEN
    PERFORM public.attach_referral(NEW.id, v_ref_code);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_profile_stats(p_user_id UUID, p_focus_minutes INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  PERFORM public.grant_study_achievements(p_user_id);
END;
$$;

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referrals they sent"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view referrals they received"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referee_id);

CREATE POLICY "Users can view own referral rewards"
  ON public.referral_rewards FOR SELECT
  USING (auth.uid() = user_id);

REVOKE ALL ON FUNCTION public.attach_referral(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.qualify_referral_and_grant_rewards(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_referral_code_for_username(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.evaluate_referrer_rewards(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_achievement_by_slug(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_study_achievements(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.attach_referral(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.qualify_referral_and_grant_rewards(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_referral_code_for_username(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.evaluate_referrer_rewards(UUID) TO service_role;
