import { resolve } from "node:path";

import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    envPrefix: "PUBLIC_",
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "#": resolve("./src"),
      },
    },
    server: {
      watch: {
        ignored: ["**/.direnv/**", "**/.devenv/**"],
      },
    },
  },
});
