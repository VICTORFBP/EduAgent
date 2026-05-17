import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["overview-headset-pouch.ngrok-free.dev"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/:path*",
      },
    ];
  },
};

export default nextConfig;
