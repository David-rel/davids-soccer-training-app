import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
    // This is the setting for API routes in Next.js 16
    proxyClientMaxBodySize: "500mb",
  },
};

export default nextConfig;
