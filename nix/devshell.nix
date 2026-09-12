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
      perSystem.self.formatter.passthru.oxfmt
    ];

    processes.devserver.exec = "pnpm exec vite";

    scripts = {
      dev.exec = /* lang bash */ ''
        set -e
        exec "${config.procfileScript}" "$@"
      '';

      generate-db-types.exec = /* lang bash */ ''
        set -e
        echo "Generating DB table TypeScript definitions..."
        pnpm exec kysely-codegen --dialect postgres --url "postgres://@/$PGDATABASE"
      '';

      migrate.exec = /* lang bash */ ''
        set -e

        PGMAX=1 node src/db/migrate.ts "$@"

        generate-db-types
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
