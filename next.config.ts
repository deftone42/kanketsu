import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const repoName = "anitime";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: isProd ? `/${repoName}` : "",
  assetPrefix: isProd ? `/${repoName}/` : "",
};

export default nextConfig;
