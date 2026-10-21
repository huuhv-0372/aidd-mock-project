import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    // Enables forbidden() and forbidden.tsx (HTTP 403 page); still experimental in Next 16.
    authInterrupts: true,
    // Viết Kudo posts up to 5 images x 5 MB plus text in one Server Action (default 1 MB). Both
    // limits must rise together: with proxy.ts present Next buffers the body up to
    // proxyClientMaxBodySize (default 10 MB) and silently truncates the rest.
    serverActions: { bodySizeLimit: "26mb" },
    proxyClientMaxBodySize: "26mb",
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
