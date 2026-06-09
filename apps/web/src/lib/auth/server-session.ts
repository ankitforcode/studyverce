import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type AppSupabaseClient = SupabaseClient<Database>;

/** One Supabase server client per RSC request. */
export const getServerSupabase = cache(async (): Promise<AppSupabaseClient> => {
  return createClient();
});

/** One auth.getUser() per RSC request — dedupes middleware-adjacent layout + page calls. */
export const getSessionUser = cache(async () => {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
