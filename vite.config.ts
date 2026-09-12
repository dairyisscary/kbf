import { resolve } from "node:path";

import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { fileRoutes } from "filesystem-routing/vite";
import { defineConfig } from "vite";

export default defineConfig({
  envPrefix: "PUBLIC_",
  plugins: [
    fileRoutes({
      codeSplitting: false,
      types: resolve("./src/virtual:file-routes.d.ts"),
    }),
    solid({
      serverFunctions: true,
      ssr: true,
      start: {
        app: resolve("./src/app.tsx"),
        document: resolve("./src/document.tsx"),
        middleware: resolve("./src/middleware.ts"),
        node: true,
      },
    }),
    tailwindcss(),
  ],
  server: {
    port: 5030,
    strictPort: true,
    watch: {
      ignored: [".direnv", ".devenv"].map((relative) => `${resolve("./", relative)}/**`),
    },
  },
});
