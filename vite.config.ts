import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react" }),
    tanstackStart(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    viteReact(),
    tsconfigPaths(),
  ],
  ssr: {
    noExternal: ["@tanstack/start**", "@tanstack/react-start**"],
    external: ["@workos-inc/node", "buffer", "events", "stream", "crypto"],
  },
  resolve: {
    alias: {
      "cloudflare:workers": "node_modules/@cloudflare/workers-types/index.d.ts",
    },
  },
  define: {
    "process.env": {},
  },
});
