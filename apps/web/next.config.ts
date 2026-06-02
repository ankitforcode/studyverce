import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Wallpaper uploads accept up to 15 MB (see MAX_WALLPAPER_SIZE_BYTES)
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
