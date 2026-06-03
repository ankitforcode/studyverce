#!/usr/bin/env sh
# Print the public HTTPS URL from the local ngrok inspector (docker compose ngrok on :4040).
set -e

INSPECTOR="${NGROK_INSPECTOR_URL:-http://127.0.0.1:4040}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required" >&2
  exit 1
fi

json=$(curl -sf "${INSPECTOR}/api/tunnels" 2>/dev/null) || {
  echo "Ngrok inspector not reachable at ${INSPECTOR}" >&2
  echo "Start the tunnel: docker compose up -d ngrok" >&2
  exit 1
}

# Prefer the studyverce-web tunnel; fall back to first https public_url
url=$(printf '%s' "$json" | sed -n 's/.*"public_url":"\(https:[^"]*\)".*/\1/p' | head -1)

if [ -z "$url" ]; then
  echo "No HTTPS tunnel found. Open ${INSPECTOR} in a browser." >&2
  exit 1
fi

echo "$url"
