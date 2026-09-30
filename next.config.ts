import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  outputFileTracingIncludes: {
    "/*": [
      "node_modules/@prisma/client/**/*",
      "node_modules/.prisma/client/**/*",
    ],
  },
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
