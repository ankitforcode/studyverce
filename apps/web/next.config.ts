import type { NextConfig } from "next";

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
  serverExternalPackages: ["ioredis", "@studyverce/rate-limit"],
  allowedDevOrigins: getAllowedDevOrigins(),
  async rewrites() {
    return [
      {
        source: "/socket.io/:path*",
        destination: `${socketUpstream}/socket.io/:path*`,
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
