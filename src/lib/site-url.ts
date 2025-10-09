import { env } from "~/env";
import { logger } from "~/lib/logger";

type OriginLike = string | URL | { origin: string } | null | undefined;

const DEFAULT_SITE_URL = "http://localhost:3000";

function extractOrigin(candidate: OriginLike): string | null {
  if (!candidate) {
    return null;
  }

  if (typeof candidate === "string") {
    return candidate;
  }

  if (candidate instanceof URL) {
    return candidate.origin;
  }

  if (typeof candidate === "object" && "origin" in candidate) {
    const originValue = candidate.origin;
    if (typeof originValue === "string") {
      return originValue;
    }
  }

  return null;
}

function sanitizeOrigin(candidate: string | null | undefined): string | null {
  if (!candidate) {
    return null;
  }

  try {
    const url = new URL(candidate);
    return url.origin;
  } catch (error) {
    if (!candidate.includes("://")) {
      try {
        const url = new URL(`https://${candidate}`);
        logger.warn("Assuming https:// scheme for origin", { candidate });
        return url.origin;
      } catch (httpsError) {
        logger.warn("Unable to parse site origin after https:// patch", {
          candidate,
          error: httpsError,
        });
        return null;
      }
    }
    logger.warn("Unable to parse site origin", { candidate, error });
    return null;
  }
}

function resolveBaseOrigin(preferred?: OriginLike): string {
  const envOrigin = sanitizeOrigin(env.NEXT_PUBLIC_SITE_URL);
  if (envOrigin) {
    return envOrigin;
  }

  const preferredOrigin = sanitizeOrigin(extractOrigin(preferred));
  if (preferredOrigin) {
    return preferredOrigin;
  }

  return DEFAULT_SITE_URL;
}

export function resolveSiteUrl(preferred?: OriginLike): string {
  return resolveBaseOrigin(preferred);
}

export function resolveWorkOSRedirectUri(preferred?: OriginLike): string {
  return `${resolveBaseOrigin(preferred)}/api/auth/callback`;
}

export function resolveWhoopRedirectUri(preferred?: OriginLike): string {
  if (env.WHOOP_REDIRECT_URI) {
    return env.WHOOP_REDIRECT_URI;
  }

  return `${resolveBaseOrigin(preferred)}/api/auth/whoop/callback`;
}
