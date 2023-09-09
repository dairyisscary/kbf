/// <reference types="solid-start/env" />

interface ImportMetaEnv {
  readonly PUBLIC_RELEASE_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "solid-start-node" {
  import type { Adapter } from "solid-start/vite";
  const adapter: () => Adapter;
  export default adapter;
}
