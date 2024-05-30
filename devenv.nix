{ config, pkgs, lib, self, ... }:
let
  inherit (pkgs.stdenv) system;
  inherit (self.packages.${system}) kbf;
in
{
  dotenv.disableHint = true;

  env = {
    # Avoid infinite recursion with `scripts.dev`.
    DEVENV_PROFILE = lib.mkForce "${config.env.DEVENV_DOTFILE}/profile";
  } // lib.optionalAttrs config.services.postgres.enable {
    PGDATABASE = "kbf_dev";
    PGMAX = 25;
  };

  packages = [
    kbf.nodejs
    kbf.nodejs.pkgs.pnpm
    kbf.nodejs.pkgs.typescript-language-server
  ];

  scripts = {
    prettier.exec = ''
      set -e
      "$DEVENV_ROOT/node_modules/.bin/prettier" "$@"
    '';
    dev.exec = ''
      set -e
      exec "${config.procfileScript}" "$@"
    '';
    migrate.exec = ''
      set -e
      local-esbuild() {
        "$DEVENV_ROOT/node_modules/.bin/esbuild" --platform=node --target=node20 "$@"
      }

      rm -rf dist/scripts
      local-esbuild --bundle --outfile=dist/scripts/migrate.cjs src/db/migrate.tsx
      local-esbuild --outdir=dist/scripts/migrations src/db/migrations/*
      node dist/scripts/migrate.cjs

      generate-db-types
    '';
    generate-db-types.exec = ''
      set -e
      pnpm exec kysely-codegen --dialect postgres --url "postgres://@/$PGDATABASE"
    '';
  };

  processes.start.exec = "pnpm start";

  services.postgres = {
    enable = true;
    package = pkgs.postgresql_16;
    initialDatabases = [{ name = config.env.PGDATABASE; }];
  };
}
