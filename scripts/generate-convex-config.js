#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Generate convex.json from environment variables
const convexConfig = {
  project: process.env.CONVEX_PROJECT_NAME,
  prodUrl: process.env.CONVEX_URL,
  functions: "convex/"
};

// Only generate if environment variables are present
if (convexConfig.project && convexConfig.prodUrl) {
  const configPath = path.join(process.cwd(), 'convex.json');
  fs.writeFileSync(configPath, JSON.stringify(convexConfig, null, 2));
  console.log('✅ Generated convex.json from environment variables');
  console.log(JSON.stringify(convexConfig, null, 2));
} else {
  console.log('⚠️ CONVEX_PROJECT_NAME or CONVEX_URL not found, skipping convex.json generation');
}