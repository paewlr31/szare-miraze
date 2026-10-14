import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { unoptimized: true },
  outputFileTracingRoot: path.resolve(__dirname),
  serverExternalPackages: ["pg"],
};

export default nextConfig;
