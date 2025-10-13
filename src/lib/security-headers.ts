import type { NextResponse } from "next/server";

const POSTHOG_DOMAINS = [
  "https://us.i.posthog.com",
  "https://us-assets.i.posthog.com",
];

const WHOOP_API = "https://api.prod.whoop.com";

const SECURITY_HEADER_VALUES: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

const API_ROBOTS_VALUE = "noindex";

const NONCE_HEADER_KEY = "x-nonce";

export function createNonce(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  let binary = "";
  array.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function buildContentSecurityPolicy(nonce: string): string {
  const nonceDirective = `'nonce-${nonce}'`;
  const directives = [
    "default-src 'self'",
    `script-src 'self' ${POSTHOG_DOMAINS.join(" ")} ${nonceDirective}`,
    `style-src 'self' ${nonceDirective} 'unsafe-hashes'`,
    "img-src 'self' data: https: blob:",
    `connect-src 'self' ${WHOOP_API} ${POSTHOG_DOMAINS.join(" ")}`,
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

export function withNonceHeader(
  headers: Headers,
  nonce: string,
): Headers {
  const updated = new Headers(headers);
  updated.set(NONCE_HEADER_KEY, nonce);
  return updated;
}

export function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/") || pathname.startsWith("/trpc");
}

export { SECURITY_HEADER_VALUES, API_ROBOTS_VALUE, NONCE_HEADER_KEY };
