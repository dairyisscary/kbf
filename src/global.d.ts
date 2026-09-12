interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly PUBLIC_RELEASE_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
