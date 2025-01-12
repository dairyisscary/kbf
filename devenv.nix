{ config, pkgs, lib, self, ... }:
let
  inherit (pkgs.stdenv) system;
  inherit (self.packages.${system}.kbf) nodejs pnpm;
in
{
  dotenv.disableHint = true;

  env = {
    # Avoid infinite recursion with `scripts.dev`.
    DEVENV_PROFILE = lib.mkForce "${config.env.DEVENV_DOTFILE}/profile";

    # Dev database
    PGDATABASE = "kbf_dev";
    PGMAX = "25";

    # Dev sessions
    ADMIN_PASSWORD = "ppdemo123";
    SESSION_SECRET = "672519e3-6ff7-4afc-bc01-55d80221074a";
  };

  packages = [
    nodejs
    pnpm
    nodejs.pkgs.typescript-language-server
  ];

  scripts = {
    prettier.exec = /* lang bash */ ''
      set -e
      "$DEVENV_ROOT/node_modules/.bin/prettier" "$@"
    '';
    dev.exec = /* lang bash */ ''
      set -e
      exec "${config.procfileScript}" "$@"
    '';
    migrate.exec = /* lang bash */ ''
      set -e

      local-esbuild() {
        "$DEVENV_ROOT/node_modules/.bin/esbuild" --platform=node --target=node22 "$@"
      }

      rm -rf .output/scripts
      local-esbuild --bundle --outfile=.output/scripts/migrate.cjs src/db/migrate.tsx
      local-esbuild --outdir=.output/scripts/migrations src/db/migrations/*

      node .output/scripts/migrate.cjs "$@"

      generate-db-types
    '';
    generate-db-types.exec = /* lang bash */ ''
      set -e
      pnpm exec kysely-codegen --dialect postgres --url "postgres://@/$PGDATABASE"
    '';
  };

  processes.devserver.exec = "pnpm exec vinxi dev";

  services.postgres = {
    enable = true;
    package = pkgs.postgresql_16;
    initialDatabases = [{ name = config.env.PGDATABASE; }];
  };
}
