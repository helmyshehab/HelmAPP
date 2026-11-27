import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@helm/api-client-ts"],
  experimental: {
    serverActions: {
      // Cover files can be 5 MiB. Allow room for multipart form metadata.
      bodySizeLimit: "6mb",
    },
  },
  // A lockfile above this repo would otherwise be chosen as the workspace root.
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
};

export default nextConfig;
