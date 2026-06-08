import {
  getLazyRedis,
  isLazyRedisConfigured,
  REDIS_TTL,
  studyAssistantDailyQuotaKey,
} from "@studyverce/redis";

function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export type StudyAssistantQuotaStatus = {
  dailyPromptLimit: number;
  dailyPromptsUsed: number;
  dailyPromptsRemaining: number;
  dayKey: string;
  skipped?: boolean;
};

export async function getStudyAssistantQuotaStatus(input: {
  userId: string;
  roomId: string;
  dailyPromptLimit: number;
}): Promise<StudyAssistantQuotaStatus> {
  const dayKey = utcDayKey();
  const base = {
    dailyPromptLimit: input.dailyPromptLimit,
    dayKey,
  };

  if (!isLazyRedisConfigured()) {
    return {
      ...base,
      dailyPromptsUsed: 0,
      dailyPromptsRemaining: input.dailyPromptLimit,
      skipped: true,
    };
  }

  try {
    const redis = await getLazyRedis();
    if (!redis) {
      return {
        ...base,
        dailyPromptsUsed: 0,
        dailyPromptsRemaining: input.dailyPromptLimit,
        skipped: true,
      };
    }

    const key = studyAssistantDailyQuotaKey(input.userId, input.roomId, dayKey);
    const raw = await redis.get(key);
    const used = raw ? Number.parseInt(raw, 10) : 0;
    const dailyPromptsUsed = Number.isFinite(used) ? used : 0;

    return {
      ...base,
      dailyPromptsUsed,
      dailyPromptsRemaining: Math.max(0, input.dailyPromptLimit - dailyPromptsUsed),
    };
  } catch {
    return {
      ...base,
      dailyPromptsUsed: 0,
      dailyPromptsRemaining: input.dailyPromptLimit,
      skipped: true,
    };
  }
}

export async function consumeStudyAssistantPrompt(input: {
  userId: string;
  roomId: string;
  dailyPromptLimit: number;
}): Promise<
  | { allowed: true; status: StudyAssistantQuotaStatus }
  | { allowed: false; status: StudyAssistantQuotaStatus }
> {
  const status = await getStudyAssistantQuotaStatus(input);

  if (status.dailyPromptsRemaining <= 0) {
    return { allowed: false, status };
  }

  if (status.skipped) {
    return {
      allowed: true,
      status: {
        ...status,
        dailyPromptsUsed: status.dailyPromptsUsed + 1,
        dailyPromptsRemaining: Math.max(0, status.dailyPromptsRemaining - 1),
      },
    };
  }

  try {
    const redis = await getLazyRedis();
    if (!redis) {
      return {
        allowed: true,
        status: {
          ...status,
          dailyPromptsUsed: status.dailyPromptsUsed + 1,
          dailyPromptsRemaining: Math.max(0, status.dailyPromptsRemaining - 1),
          skipped: true,
        },
      };
    }

    const key = studyAssistantDailyQuotaKey(input.userId, input.roomId, status.dayKey);
    const used = await redis.incr(key);
    if (used === 1) {
      await redis.expire(key, REDIS_TTL.studyAssistantQuotaSeconds);
    }

    const dailyPromptsUsed = used;
    const dailyPromptsRemaining = Math.max(
      0,
      input.dailyPromptLimit - dailyPromptsUsed
    );

    return {
      allowed: dailyPromptsUsed <= input.dailyPromptLimit,
      status: {
        dailyPromptLimit: input.dailyPromptLimit,
        dailyPromptsUsed,
        dailyPromptsRemaining,
        dayKey: status.dayKey,
      },
    };
  } catch {
    return {
      allowed: true,
      status: {
        ...status,
        dailyPromptsUsed: status.dailyPromptsUsed + 1,
        dailyPromptsRemaining: Math.max(0, status.dailyPromptsRemaining - 1),
        skipped: true,
      },
    };
  }
}
