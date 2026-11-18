import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@helm/api-client-ts"],
};

export default nextConfig;
