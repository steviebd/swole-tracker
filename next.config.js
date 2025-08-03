/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - next-pwa has no types in JS config; safe to import
import withPWA from "next-pwa";

const baseConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/ingest/flags",
        destination: "https://us.i.posthog.com/flags",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

// Configure next-pwa with conservative defaults
const withPWAWrapped = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    // Static assets - cache-first
    {
      urlPattern: /^https?.*\.(?:js|css|png|jpg|jpeg|svg|ico|woff2?)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
        expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 days
      },
    },
    // API routes (Next/tRPC) - network-first with fallback
    {
      urlPattern: /^https?:\/\/[^/]+\/api\/.*$/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        networkTimeoutSeconds: 4,
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 10 }, // 10 minutes
      },
    },
  ],
});

const config = withPWAWrapped(baseConfig);

export default config;
