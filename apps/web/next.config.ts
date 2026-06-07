import path from "node:path";
import type { NextConfig } from "next";

/** Turbopack resolves packages from the pnpm workspace root (lockfile location). */
const monorepoRoot = path.resolve(import.meta.dirname, "../..");

/** Hostnames allowed to load Next.js dev assets (HMR) when tunneled via ngrok. */
function getAllowedDevOrigins(): string[] {
  const hosts = new Set<string>(["localhost:3001", "127.0.0.1:3001"]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      hosts.add(new URL(appUrl).host);
    } catch {
      /* ignore invalid URL */
    }
  }

  const extra = process.env.NEXT_ALLOWED_DEV_ORIGINS?.trim();
  if (extra) {
    for (const entry of extra.split(",")) {
      const host = entry.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
      if (host) hosts.add(host);
    }
  }

  return [...hosts];
}

const socketUpstream =
  process.env.SOCKET_SERVER_INTERNAL_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:3002";

const nextConfig: NextConfig = {
  // Bundle traced runtime deps for Amplify Hosting Compute (pnpm monorepo).
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
  serverExternalPackages: ["ioredis", "@studyverce/rate-limit"],
  allowedDevOrigins: getAllowedDevOrigins(),
  async rewrites() {
    return [
      {
        source: "/socket.io/:path*",
        destination: `${socketUpstream}/socket.io/:path*`,
      },
      {
        source: "/presence",
        destination: `${socketUpstream}/presence`,
      },
    ];
  },
  experimental: {
    serverActions: {
      // Wallpaper uploads accept up to 15 MB (see MAX_WALLPAPER_SIZE_BYTES)
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
