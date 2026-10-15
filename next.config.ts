import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  // Off until OpenNext ships workerd staged rendering (opennextjs-cloudflare#1318): with Cache
  // Components on, any route streaming a dynamic <Suspense> hangs on Workers (error 1101).
  cacheComponents: false,
  partialPrefetching: false,
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
