import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    envPrefix: "PUBLIC_",
    plugins: [tailwindcss()],
    server: {
      watch: {
        ignored: ["**/.direnv/**", "**/.devenv/**"],
      },
    },
  },
});
