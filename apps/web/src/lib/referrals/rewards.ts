"use server";

import { createServiceClient } from "@/lib/supabase/service";

export type QualifyReferralResult = {
  qualified: boolean;
  referrerId?: string;
};

export async function syncReferralCodeForUsername(
  userId: string,
  username: string
): Promise<void> {
  const service = createServiceClient();
  const { error } = await service.rpc("sync_referral_code_for_username", {
    p_user_id: userId,
    p_username: username,
  });
  if (error) {
    console.error("syncReferralCodeForUsername:", error.message);
  }
}

export async function attachReferralFromCode(
  refereeId: string,
  referralCode: string
): Promise<boolean> {
  const service = createServiceClient();
  const { data, error } = await service.rpc("attach_referral", {
    p_referee_id: refereeId,
    p_referral_code: referralCode,
  });
  if (error) {
    console.error("attachReferralFromCode:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function qualifyReferralAndGrantRewards(
  refereeId: string
): Promise<QualifyReferralResult> {
  const service = createServiceClient();
  const { data, error } = await service.rpc("qualify_referral_and_grant_rewards", {
    p_referee_id: refereeId,
  });
  if (error) {
    console.error("qualifyReferralAndGrantRewards:", error.message);
    return { qualified: false };
  }
  const payload = data as { qualified?: boolean; referrer_id?: string } | null;
  return {
    qualified: Boolean(payload?.qualified),
    referrerId: payload?.referrer_id,
  };
}
