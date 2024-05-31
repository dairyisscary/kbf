/// <reference types="@solidjs/start/env" />

declare module "*.png" {
  const src: string;
  export default src;
}
declare module "*.svg" {
  const src: string;
  export default src;
}

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

interface ImportMetaEnv {
  readonly PUBLIC_RELEASE_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
