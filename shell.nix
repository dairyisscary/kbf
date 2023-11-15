{ pkgs, inputs, system }: inputs.devenv.lib.mkShell {
  inherit inputs pkgs;
  modules = [
    ({ config, pkgs, ... }: {
      packages =
        let
          nodePackages = pkgs.nodePackages.override { nodejs = pkgs.nodejs_20; };
        in
        [
          pkgs.nodejs-slim_20
          nodePackages.pnpm
          nodePackages.typescript-language-server
        ];

      dotenv.disableHint = true;

      scripts = {
        prettier.exec = ''
          ${pkgs.nodejs-slim_20}/bin/node "$DEVENV_ROOT/node_modules/prettier/bin/prettier.cjs" "$@"
        '';
        dev.exec = ''
          #!/usr/bin/env bash
          set -e
          exec "$(nix build "$DEVENV_ROOT#devShells.${system}.kbf.config.procfileScript" --no-link --print-out-paths --impure)" "$@"
        '';
        migrate.exec = ''
          #!/usr/bin/env bash
          set -e

          local-esbuild() {
            ./node_modules/.bin/esbuild --platform=node --target=node20 "$@"
          }

          rm -rf dist/scripts
          local-esbuild --bundle --outfile=dist/scripts/migrate.cjs src/db/migrate.tsx
          local-esbuild --outdir=dist/scripts/migrations src/db/migrations/*
          node dist/scripts/migrate.cjs

          generate-db-types
        '';
        generate-db-types.exec = ''
          #!/usr/bin/env bash
          set -e
          pnpm kysely-codegen --dialect 'postgres' --url 'postgres://@/kbf_dev'
        '';
      };

      processes = {
        start.exec = "pnpm start";
      };

      env = {
        name = "kbf-devshell";
      } // (if config.services.postgres.enable then {
        PGDATABASE = "kbf_dev";
        PGMAX = 25;
      } else { });

      services = {
        postgres = {
          enable = true;
          package = pkgs.postgresql_15;
          initialDatabases = [{ name = config.env.PGDATABASE; }];
        };
      };
    })
  ];
}
