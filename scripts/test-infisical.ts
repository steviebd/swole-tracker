#!/usr/bin/env bun
/**
 * Test Infisical API connection and list available environments/secrets
 */

import { config } from "dotenv";
import { join, resolve } from "path";
import { existsSync } from "fs";

const projectRoot = resolve(process.cwd());
const envPath = join(projectRoot, ".env.local");

if (existsSync(envPath)) {
  config({ path: envPath });
}

const INFISICAL_API_URL = process.env.INFISICAL_API_URL || "https://app.infisical.com";

async function getInfisicalToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const url = `${INFISICAL_API_URL}/api/v1/auth/universal-auth/login`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Infisical login failed: ${res.status} ${res.statusText} - ${body}`,
    );
  }
  const data = (await res.json()) as { accessToken?: string };
  if (!data.accessToken) {
    throw new Error("Infisical login response missing accessToken");
  }
  return data.accessToken;
}

async function listProjectEnvironments(token: string, workspaceId: string) {
  const url = `${INFISICAL_API_URL}/api/v2/workspace/${workspaceId}/environments`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("Error:", body);
    throw new Error(`Failed to list environments: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function getInfisicalSecrets(options: {
  token: string;
  workspaceId: string;
  environment: string;
  secretPath?: string;
}) {
  const { token, workspaceId, environment, secretPath = "/" } = options;
  const params = new URLSearchParams({
    environment,
    workspaceId,
    secretPath,
  });
  const url = `${INFISICAL_API_URL}/api/v3/secrets/raw?${params.toString()}`;
  console.log(`🔍 Testing URL: ${url}`);
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!res.ok) {
    const body = await res.text();
    console.error("API Error Response:", body);
    throw new Error(`Failed to get secrets: ${res.status} ${res.statusText}`);
  }
  
  return res.json();
}

async function main() {
  const {
    INFISICAL_CLIENT_ID,
    INFISICAL_SECRET,
    INFISICAL_PROJECT_ID,
  } = process.env;

  if (!INFISICAL_CLIENT_ID || !INFISICAL_SECRET || !INFISICAL_PROJECT_ID) {
    console.error("❌ Missing Infisical credentials");
    process.exit(1);
  }

  console.log("🔑 Testing Infisical connection...");
  console.log(`📋 Project ID: ${INFISICAL_PROJECT_ID}`);
  console.log(`🌐 API URL: ${INFISICAL_API_URL}`);
  
  try {
    // 1. Get access token
    console.log("1️⃣ Getting access token...");
    const token = await getInfisicalToken(INFISICAL_CLIENT_ID, INFISICAL_SECRET);
    console.log("✅ Successfully authenticated");

    // 2. Skip listing environments (API endpoint may not exist)
    console.log("2️⃣ Skipping environment listing (API endpoint may vary)");

    // 3. Test getting secrets from different environment names
    const testEnvironments = ["Development", "Staging", "Production", "dev", "staging", "production", "development"];
    
    for (const env of testEnvironments) {
      console.log(`\n3️⃣ Testing environment: "${env}"`);
      try {
        const secrets = await getInfisicalSecrets({
          token,
          workspaceId: INFISICAL_PROJECT_ID,
          environment: env,
        });
        console.log(`✅ Found ${secrets.secrets?.length || 0} secrets in "${env}"`);
        if (secrets.secrets?.length > 0) {
          console.log("🔑 Secret keys found:");
          secrets.secrets.forEach((s: any) => console.log(`   - ${s.secretKey}`));
        }
      } catch (error) {
        console.log(`❌ Error for "${env}": ${error.message}`);
      }
    }

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

await main();