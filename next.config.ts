import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ];
  },
};

export default nextConfig;
