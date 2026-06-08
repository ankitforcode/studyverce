import type { User } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";

/** Look up an auth user by email (service role). Returns null when not found. */
export async function findAuthUserByEmail(email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  const service = createServiceClient();

  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(error.message);
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (match) return match;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}
