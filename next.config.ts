import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // MSW patches Node's http. Bundling it would intercept a copy axios never uses.
  serverExternalPackages: ["msw"],
  experimental: {
    agentFeedback: true,
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
