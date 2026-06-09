import { CreateRoomForm } from "@/app/rooms/new/create-room-form";
import { createClient } from "@/lib/supabase/server";
import {
  FREE_MAX_ROOM_PARTICIPANTS,
  fetchUserPlanTier,
  getPlanMaxRoomParticipants,
} from "@/lib/plan-limits";
import { createSiteMetadata, NOINDEX_ROBOTS } from "@/lib/site-metadata";

export const metadata = createSiteMetadata({
  path: "/rooms/new",
  title: "Create Study Room",
  description: "Create a new virtual study room on StudyVerce with Pomodoro, chat, and shared focus tools.",
  robots: NOINDEX_ROBOTS,
});

export default async function NewRoomPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const planTier = user ? await fetchUserPlanTier(supabase, user.id) : "free";
  const planCap = getPlanMaxRoomParticipants(planTier);

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <CreateRoomForm
        maxParticipantsDefault={planCap ?? 50}
        maxParticipantsCap={planCap ?? 100}
        participantLimitLabel={
          planCap !== null
            ? `Free plan rooms are limited to ${FREE_MAX_ROOM_PARTICIPANTS} participants. Upgrade to Premium for larger study groups.`
            : null
        }
      />
    </div>
  );
}
