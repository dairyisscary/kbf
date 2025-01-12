import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  vite: {
    envPrefix: "PUBLIC_",
    server: {
      watch: {
        ignored: ["**/.direnv/**", "**/.devenv/**"],
      },
    },
  },
});
