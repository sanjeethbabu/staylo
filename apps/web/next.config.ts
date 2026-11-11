import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Internal workspace packages are shipped as TypeScript source.
  transpilePackages: ["@staylo/core", "@staylo/ui"],
  poweredByHeader: false,
};

export default nextConfig;
