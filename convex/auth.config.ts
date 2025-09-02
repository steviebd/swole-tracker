// convex/auth.config.ts
// Auth configuration for Convex to validate WorkOS AuthKit tokens
// Convex will accept JWTs issued by WorkOS and extract identity for ctx.auth

const applicationID =
  process.env.WORKOS_CLIENT_ID || process.env.NEXT_PUBLIC_WORKOS_CLIENT_ID;

if (!applicationID) {
  console.warn(
    "[convex/auth.config.ts] WORKOS_CLIENT_ID (or NEXT_PUBLIC_WORKOS_CLIENT_ID) is not set. Auth validation will fail.",
  );
}

export default {
  providers: [
    {
      // WorkOS issues tokens with this issuer
      domain: "https://api.workos.com",
      // Must equal the `aud` claim in the AuthKit access token (WorkOS Client ID)
      applicationID: applicationID as string,
    },
  ],
};
