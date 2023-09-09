import solid from "solid-start/vite";
import nodeAdapter from "solid-start-node";
import { defineConfig } from "vite";

export default defineConfig({
  envPrefix: "PUBLIC_",
  plugins: [solid({ adapter: nodeAdapter() })],
});
