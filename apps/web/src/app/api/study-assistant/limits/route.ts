import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchUserPlanTier } from "@/lib/plan-limits";
import { getStudyAssistantPlanLimits } from "@/lib/study-assistant-limits";
import { getStudyAssistantQuotaStatus } from "@/lib/study-assistant-quota";
import type { PlanTier } from "@studyverce/shared";
import { isUserRoomMember } from "@/lib/rooms/membership";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId")?.trim();

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  const isMember = await isUserRoomMember(supabase, roomId, user.id);
  if (!isMember) {
    return NextResponse.json({ error: "Not a member of this room" }, { status: 403 });
  }

  const planTier = await fetchUserPlanTier(supabase, user.id);
  const limits = getStudyAssistantPlanLimits(planTier);

  if (limits.dailyPromptLimit === null) {
    return NextResponse.json({
      planTier,
      teamFeatures: limits.teamFeatures,
      memoryEnabled: limits.memoryEnabled,
      dailyPromptLimit: null,
      dailyPromptsUsed: 0,
      dailyPromptsRemaining: null,
    });
  }

  const quota = await getStudyAssistantQuotaStatus({
    userId: user.id,
    roomId,
    dailyPromptLimit: limits.dailyPromptLimit,
  });

  return NextResponse.json({
    planTier,
    teamFeatures: limits.teamFeatures,
    memoryEnabled: limits.memoryEnabled,
    dailyPromptLimit: quota.dailyPromptLimit,
    dailyPromptsUsed: quota.dailyPromptsUsed,
    dailyPromptsRemaining: quota.dailyPromptsRemaining,
  });
}
