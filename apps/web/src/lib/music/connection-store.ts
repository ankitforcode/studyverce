import type { StreamingMusicProvider } from "@studyverce/shared";
import type { TypedSupabaseClient } from "@/lib/supabase/server";

export const MUSIC_CONNECTIONS_MIGRATION_HINT =
  "Run `supabase db push --local` (local) or apply migration 20250603000001_user_music_connections.sql on your Supabase project.";

const ALL_STREAMING_PROVIDERS = [
  "spotify",
  "youtube_music",
  "apple_music",
] as const satisfies readonly StreamingMusicProvider[];

function isMissingConnectionsTable(error: { message?: string; code?: string }): boolean {
  const msg = error.message ?? "";
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    msg.includes("user_music_connections") ||
    msg.includes("schema cache")
  );
}

function emptyConnectionStatuses(): {
  provider: StreamingMusicProvider;
  connected: boolean;
  displayName: string | null;
  expiresAt: string | null;
}[] {
  return ALL_STREAMING_PROVIDERS.map((provider) => ({
    provider,
    connected: false,
    displayName: null,
    expiresAt: null,
  }));
}

function rethrowUnlessMissingTable(error: { message?: string; code?: string }): void {
  if (isMissingConnectionsTable(error)) {
    throw new Error(`Music connections table is missing. ${MUSIC_CONNECTIONS_MIGRATION_HINT}`);
  }
  throw new Error(error.message ?? "Database error");
}

export interface StoredMusicConnection {
  userId: string;
  provider: StreamingMusicProvider;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  displayName: string | null;
}

export async function upsertMusicConnection(
  supabase: TypedSupabaseClient,
  input: {
    userId: string;
    provider: StreamingMusicProvider;
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: Date | null;
    scope?: string | null;
    providerAccountId?: string | null;
    displayName?: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from("user_music_connections").upsert(
    {
      user_id: input.userId,
      provider: input.provider,
      access_token: input.accessToken,
      refresh_token: input.refreshToken ?? null,
      expires_at: input.expiresAt?.toISOString() ?? null,
      scope: input.scope ?? null,
      provider_account_id: input.providerAccountId ?? null,
      display_name: input.displayName ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" }
  );

  if (error) rethrowUnlessMissingTable(error);
}

export async function getMusicConnection(
  supabase: TypedSupabaseClient,
  userId: string,
  provider: StreamingMusicProvider
): Promise<StoredMusicConnection | null> {
  const { data, error } = await supabase
    .from("user_music_connections")
    .select(
      "user_id, provider, access_token, refresh_token, expires_at, display_name"
    )
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) rethrowUnlessMissingTable(error);
  if (!data) return null;

  return {
    userId: data.user_id,
    provider: data.provider as StreamingMusicProvider,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    displayName: data.display_name,
  };
}

export async function deleteMusicConnection(
  supabase: TypedSupabaseClient,
  userId: string,
  provider: StreamingMusicProvider
): Promise<void> {
  const { error } = await supabase
    .from("user_music_connections")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) rethrowUnlessMissingTable(error);
}

export async function listConnectionStatuses(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<
  {
    provider: StreamingMusicProvider;
    connected: boolean;
    displayName: string | null;
    expiresAt: string | null;
  }[]
> {
  const { data, error } = await supabase
    .from("user_music_connections")
    .select("provider, display_name, expires_at")
    .eq("user_id", userId);

  if (error) {
    if (isMissingConnectionsTable(error)) return emptyConnectionStatuses();
    throw new Error(error.message);
  }

  const byProvider = new Map(
    (data ?? []).map((row) => [
      row.provider as StreamingMusicProvider,
      {
        displayName: row.display_name,
        expiresAt: row.expires_at,
      },
    ])
  );

  return ALL_STREAMING_PROVIDERS.map((provider) => {
    const row = byProvider.get(provider);
    return {
      provider,
      connected: !!row,
      displayName: row?.displayName ?? null,
      expiresAt: row?.expiresAt ?? null,
    };
  });
}
