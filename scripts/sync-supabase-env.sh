#!/usr/bin/env bash
# Sync local Supabase API URL + keys into apps/web/.env.local from `supabase status`.
# Run after `supabase start` or whenever you see invalid JWT / service role errors locally.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/apps/web/.env.local"

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found" >&2
  exit 1
fi

STATUS_ENV="$(cd "$ROOT" && supabase status -o env 2>/dev/null)" || {
  echo "Is local Supabase running? Try: supabase start" >&2
  exit 1
}

read_var() {
  local name="$1"
  printf '%s\n' "$STATUS_ENV" | sed -n "s/^${name}=\"\(.*\)\"$/\1/p"
}

API_URL="$(read_var API_URL)"
PUBLISHABLE_KEY="$(read_var PUBLISHABLE_KEY)"
SERVICE_ROLE_KEY="$(read_var SERVICE_ROLE_KEY)"

for v in API_URL PUBLISHABLE_KEY SERVICE_ROLE_KEY; do
  if [[ -z "${!v}" ]]; then
    echo "Missing $v from supabase status" >&2
    exit 1
  fi
done

touch "$ENV_FILE"

upsert() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    if [[ "$(uname)" == Darwin ]]; then
      sed -i '' "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    else
      sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    fi
  else
    printf '%s=%s\n' "$key" "$value" >>"$ENV_FILE"
  fi
}

upsert NEXT_PUBLIC_SUPABASE_URL "$API_URL"
upsert NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "$PUBLISHABLE_KEY"
upsert SUPABASE_SERVICE_ROLE_KEY "$SERVICE_ROLE_KEY"

echo "Synced Supabase keys into apps/web/.env.local"
echo "Restart pnpm dev to apply."
