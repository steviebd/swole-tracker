/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */

const baseConfig = {
  // Required for OpenNext
  output: 'standalone',
  // Configure Webpack for Cloudflare compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // For client-side builds, disable Node.js modules that aren't available in browsers
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "node:http": false,
        "node:https": false,
        "node:net": false,
        "node:tls": false,
        "node:fs": false,
        "node:path": false,
        "node:stream": false,
        "node:crypto": false,
        "node:util": false,
        "node:url": false,
        "node:querystring": false,
        "node:buffer": false,
      };
    }
    
    // For Cloudflare Workers, ensure proper module resolution
    if (process.env.CLOUDFLARE_WORKERS) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': './src',
      };
    }
    
    return config;
  },
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
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us.i.posthog.com https://us-assets.i.posthog.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://api.prod.whoop.com https://us.i.posthog.com https://us-assets.i.posthog.com https://api.workos.com wss: ws:",
              "font-src 'self' data:",
              "object-src 'none'",
              "media-src 'self'",
              "frame-src 'none'",
              "worker-src 'self' blob:",
              "child-src 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "manifest-src 'self'"
            ].join("; "),
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

// PWA support removed due to incompatibility with Next.js 15 App Router
// next-pwa v5.6.0 uses Pages Router architecture which conflicts with App Router

// Apply Cloudflare-specific configurations
const config = {
  ...baseConfig,
  // Ensure static exports are disabled for Workers
  output: process.env.CLOUDFLARE_WORKERS ? undefined : baseConfig.output,
  // Disable image optimization for Workers (not supported)
  images: process.env.CLOUDFLARE_WORKERS ? {
    unoptimized: true,
  } : baseConfig.images,
};

export default config;
