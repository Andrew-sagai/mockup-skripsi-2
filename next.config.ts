import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow all image sources for demo assets
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
