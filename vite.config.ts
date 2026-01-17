import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { envInjection } from "./scripts/vite-env-injection";

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react" }),
    tanstackStart(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    viteReact(),
    tsconfigPaths(),
    envInjection(),
  ],
  resolve: {
    alias: {
      "buffer/index.js": "node:buffer",
      buffer: "node:buffer",
    },
  },
  ssr: {
    noExternal: ["@tanstack/start**", "@tanstack/react-start**"],
    resolve: {
      conditions: ["workerd", "edge-light", "worker", "browser"],
    },
  },
});
