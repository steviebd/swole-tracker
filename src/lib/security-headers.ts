import type { NextResponse } from "next/server";

const POSTHOG_DOMAINS = [
  "https://us.i.posthog.com",
  "https://us-assets.i.posthog.com",
];

const CLOUDFLARE_INSIGHTS_DOMAIN = "https://static.cloudflareinsights.com";

const WHOOP_API = "https://api.prod.whoop.com";

const SECURITY_HEADER_VALUES: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

const API_ROBOTS_VALUE = "noindex";

const NONCE_HEADER_KEY = "x-nonce";

type CryptoLike = {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
};

const globalCrypto = globalThis.crypto as CryptoLike | undefined;

export function createNonce(
  cryptoImpl: CryptoLike | undefined = globalCrypto,
): string {
  if (!cryptoImpl) {
    throw new Error("Crypto API is not available");
  }

  if (typeof cryptoImpl.randomUUID === "function") {
    return cryptoImpl.randomUUID();
  }

  if (typeof cryptoImpl.getRandomValues === "function") {
    const array = new Uint8Array(16);
    cryptoImpl.getRandomValues(array);
    return encodeBase64(array);
  }

  throw new Error("Crypto API does not support secure random generation");
}

function encodeBase64(bytes: Uint8Array): string {
  const maybeBuffer = (
    globalThis as {
      Buffer?: {
        from: (input: Uint8Array) => { toString(encoding: string): string };
      };
    }
  ).Buffer;
  if (maybeBuffer) {
    return maybeBuffer.from(bytes).toString("base64");
  }

  if (typeof globalThis.btoa === "function") {
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return globalThis.btoa(binary);
  }

  throw new Error("No base64 encoder available");
}

export function buildContentSecurityPolicy(nonce: string): string {
  const nonceDirective = `'nonce-${nonce}'`;
  const directives = [
    "default-src 'self'",
    `script-src 'self' ${POSTHOG_DOMAINS.join(" ")} ${CLOUDFLARE_INSIGHTS_DOMAIN} ${nonceDirective}`,
    `style-src 'self' ${nonceDirective} 'unsafe-hashes' 'sha256-HGYbL7c7YTMNrtcUQBvASpkCpnhcLdlW/2pKHJ8sJ98='`,
    "img-src 'self' data: https: blob:",
    `connect-src 'self' ${WHOOP_API} ${POSTHOG_DOMAINS.join(" ")} ${CLOUDFLARE_INSIGHTS_DOMAIN}`,
    "font-src 'self' data:",
    "object-src 'none'",
    "media-src 'self'",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "child-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "manifest-src 'self'",
  ];

  return directives.join("; ");
}

interface ApplyHeadersOptions {
  nonce: string;
  isApiRoute: boolean;
}

export function applySecurityHeaders(
  response: NextResponse,
  { nonce, isApiRoute }: ApplyHeadersOptions,
): NextResponse {
  response.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy(nonce),
  );

  for (const [key, value] of Object.entries(SECURITY_HEADER_VALUES)) {
    response.headers.set(key, value);
  }

  if (isApiRoute) {
    response.headers.set("X-Robots-Tag", API_ROBOTS_VALUE);
  }

  response.headers.set(NONCE_HEADER_KEY, nonce);

  return response;
}

export function withNonceHeader(headers: Headers, nonce: string): Headers {
  const updated = new Headers(headers);
  updated.set(NONCE_HEADER_KEY, nonce);
  return updated;
}

export function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/") || pathname.startsWith("/trpc");
}

export { SECURITY_HEADER_VALUES, API_ROBOTS_VALUE, NONCE_HEADER_KEY };
