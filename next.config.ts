import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed output: 'export' to enable dynamic rendering
  // This allows the app to handle real-time data without rebuilds
  images: {
    unoptimized: true,            // Keep unoptimized for Capacitor compatibility
  },
};

export default nextConfig;