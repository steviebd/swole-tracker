/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */

const baseConfig = {
  // Disable image optimization for Cloudflare Workers
  images: {
    unoptimized: true,
  },

  // Performance optimizations
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@tanstack/react-query",
    ],
  },

  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
    // Add support for node: protocol
    config.resolve.alias = {
      ...config.resolve.alias,
      "node:crypto": "crypto-browserify",
      "node:http": "stream-http",
      "node:https": "https-browserify",
    };

    // Optimize bundle size in production
    if (!dev && !isServer) {
      // Split chunks more aggressively for better caching
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // Separate vendor chunks
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
            priority: 10,
          },
          // UI components chunk
          ui: {
            test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
            name: "ui-components",
            chunks: "all",
            priority: 20,
          },
          // Analytics and AI chunk (lazy loaded)
          analytics: {
            test: /[\\/]providers[\\/]PostHogProvider|[\\/]ai-prompts[\\/]/,
            name: "analytics-ai",
            chunks: "all",
            priority: 15,
            enforce: true,
          },
          // Dashboard components chunk
          dashboard: {
            test: /[\\/]app[\\/]_components[\\/]|[\\/]components[\\/](quick-actions|weekly-progress|recent-workouts)/,
            name: "dashboard-components",
            chunks: "all",
            priority: 15,
          },
        },
      };
    }
    return config;
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow the Workers build to proceed while we finish the D1 type migration
    ignoreBuildErrors: true,
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

// PWA support removed due to incompatibility with Next.js 15 App Router
// next-pwa v5.6.0 uses Pages Router architecture which conflicts with App Router

const config = baseConfig;

export default config;
