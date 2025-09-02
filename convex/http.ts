import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

// HTTP router for authentication provider discovery
const http = httpRouter();

// Health check endpoint
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response("OK", { status: 200 });
  }),
});

// Authentication provider discovery endpoint
http.route({
  path: "/.well-known/openid-configuration",
  method: "GET", 
  handler: httpAction(async () => {
    // This endpoint is required for OAuth provider discovery
    // Return minimal OpenID configuration for JWT validation
    const config = {
      issuer: "https://unique-porcupine-779.convex.site",
      jwks_uri: "https://unique-porcupine-779.convex.site/.well-known/jwks.json",
      response_types_supported: ["id_token"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["HS256"],
    };

    return new Response(JSON.stringify(config), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

// JWKS endpoint for JWT validation
http.route({
  path: "/.well-known/jwks.json",
  method: "GET",
  handler: httpAction(async () => {
    // Return empty JWKS since we're using shared secret (HS256)
    // For HS256, Convex validates using the configured secret
    const jwks = {
      keys: []
    };

    return new Response(JSON.stringify(jwks), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

export default http;