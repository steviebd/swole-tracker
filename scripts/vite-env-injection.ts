import { readFileSync, existsSync } from "fs";
import { join } from "path";

function parseEnv(content: string): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    if (key) {
      vars[key] = value;
    }
  }

  return vars;
}

export function envInjection() {
  return {
    name: "env-injection",
    config() {
      const envLocalPath = join(process.cwd(), ".env.local");

      if (!existsSync(envLocalPath)) {
        console.warn("⚠️  .env.local not found, skipping env injection");
        return;
      }

      const envContent = readFileSync(envLocalPath, "utf-8");
      const envVars = parseEnv(envContent);

      const envObj: Record<string, string> = {};
      for (const [k, v] of Object.entries(envVars)) {
        envObj[k] = v;
      }

      const envJson = JSON.stringify(envObj);

      console.log(
        `✅ Injected ${Object.keys(envVars)} environment variables into Workers runtime`,
      );

      return {
        define: {
          "globalThis.__env__": envJson,
        },
      };
    },
  };
}
