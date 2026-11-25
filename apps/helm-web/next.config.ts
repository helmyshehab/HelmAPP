import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@helm/api-client-ts", "react-globe.gl", "globe.gl", "three"],
  // A lockfile above this repo would otherwise be chosen as the workspace root.
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
};

export default nextConfig;
