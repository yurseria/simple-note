import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['macbookpro-16'],
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
