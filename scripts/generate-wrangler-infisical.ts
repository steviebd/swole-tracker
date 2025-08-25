
import fs from 'fs';
import path from 'path';

const INFISICAL_API_URL = 'https://app.infisical.com';

async function getInfisicalToken(clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch(`${INFISICAL_API_URL}/api/v1/auth/universal-auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId,
      clientSecret,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to get Infisical token: ${response.statusText} - ${errorBody}`);
  }

  const { accessToken } = await response.json();
  return accessToken;
}

async function getSecrets(token: string, projectId: string, environment: string): Promise<any> {
  const response = await fetch(`${INFISICAL_API_URL}/api/v3/secrets/raw?environment=${environment}&workspaceId=${projectId}&secretPath=/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Infisical API Error:', errorBody);
    throw new Error(`Failed to get secrets: ${response.statusText}`);
  }

  const data = await response.json();
  const secrets = data.secrets;

  if (!secrets) {
    console.error('Unexpected response format from Infisical:', data);
    throw new Error('Failed to parse secrets from Infisical response.');
  }

  return secrets.reduce((acc: any, secret: any) => {
    acc[secret.secretKey] = secret.secretValue;
    return acc;
  }, {});
}

async function main() {
  try {
    // These variables should be in your environment (e.g., .env.local)
    const { INFISICAL_CLIENT_ID, INFISICAL_SECRET, INFISICAL_PROJECT_ID } = process.env;

    if (!INFISICAL_CLIENT_ID || !INFISICAL_SECRET || !INFISICAL_PROJECT_ID) {
      throw new Error('Infisical credentials are not set in the environment.');
    }

    console.log('Fetching secrets from Infisical...');
    const token = await getInfisicalToken(INFISICAL_CLIENT_ID, INFISICAL_SECRET);
    const secrets = await getSecrets(token, INFISICAL_PROJECT_ID, 'dev');
    console.log('Successfully fetched secrets.');

    const templatePath = path.resolve(process.cwd(), 'wrangler.toml.template');
    const outputPath = path.resolve(process.cwd(), 'wrangler.toml');

    let templateContent = fs.readFileSync(templatePath, 'utf-8');

    for (const key in secrets) {
      const placeholder = '$' + '{' + key + '}';
      // Use a simple string replacement, which is safer than regex for this case.
      templateContent = templateContent.split(placeholder).join(secrets[key]);
    }

    fs.writeFileSync(outputPath, templateContent);
    console.log('wrangler.toml generated successfully.');

  } catch (error) {
    console.error('Error generating wrangler.toml:', error);
    process.exit(1);
  }
}

main();
