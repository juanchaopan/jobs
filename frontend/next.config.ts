import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    VITE_BACKEND_URL: process.env.VITE_BACKEND_URL,
  },
};

export default nextConfig;
