#!/usr/bin/env bash
# Regenerate apps/web/public/logo-email.png from the Lucide BookOpen SVG source.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SVG="$ROOT/apps/web/public/logo-email.svg"
PNG="$ROOT/apps/web/public/logo-email.png"
pnpm dlx @resvg/resvg-js-cli --fit-width 56 "$SVG" "$PNG"
echo "Wrote $PNG ($(file -b "$PNG"))"
