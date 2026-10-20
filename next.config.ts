import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": ["node_modules/better-sqlite3/prebuilds/linux-x64.node"],
  },
};

export default nextConfig;
