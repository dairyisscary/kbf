{ inputs, perSystem, pkgs, ... }:
let
  inherit (perSystem.self.kbf) nodejs pnpm;

  mainModule = { config, lib, ... }: {
    dotenv.disableHint = true;

    env = {
      name = "kbf-devshell";

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

    processes.devserver.exec = "pnpm exec vinxi dev";

    scripts = {
      dev.exec = /* lang bash */ ''
        set -e
        exec "${config.procfileScript}" "$@"
      '';

      generate-db-types.exec = /* lang bash */ ''
        set -e
        pnpm exec kysely-codegen --dialect postgres --url "postgres://@/$PGDATABASE"
      '';

      migrate.exec = /* lang bash */ ''
        set -e

        local-esbuild() {
          "$DEVENV_ROOT/node_modules/esbuild/bin/esbuild" --platform=node --target=node${lib.versions.major nodejs.version} "$@"
        }

        rm -rf .output/scripts
        local-esbuild --bundle --outfile=.output/scripts/migrate.cjs src/db/migrate.tsx
        local-esbuild --outdir=.output/scripts/migrations src/db/migrations/*

        node .output/scripts/migrate.cjs "$@"

        generate-db-types
      '';

      prettier.exec = /* lang bash */ ''
        set -e
        exec "$DEVENV_ROOT/node_modules/.bin/prettier" "$@"
      '';
    };

    services.postgres = {
      enable = true;
      package = pkgs.postgresql_17;
      initialDatabases = [{ name = config.env.PGDATABASE; }];
    };
  };
in
inputs.devenv.lib.mkShell {
  inherit inputs pkgs;
  modules = [ mainModule ];
}
