import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tse3.mm.bing.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
