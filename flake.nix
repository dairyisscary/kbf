{
  description = "Kim-Butler Finance";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

    devenv = {
      url = "github:cachix/devenv";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    pnpm2nix = {
      url = "github:nzbr/pnpm2nix-nzbr";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs:
    let
      inherit (inputs) self;
      inherit (inputs.nixpkgs) lib;
      systemToPkgs = lib.genAttrs
        [ "x86_64-linux" "aarch64-darwin" ]
        (system: import inputs.nixpkgs { inherit system; });
      forEachSystem = mapFn: builtins.mapAttrs mapFn systemToPkgs;
    in
    {
      devShells = forEachSystem (system: pkgs: rec {
        kbf = inputs.devenv.lib.mkShell {
          inherit inputs pkgs;
          modules = [
            { env.name = "kbf-devshell"; }
            (import ./devenv.nix)
          ];
        };
        default = kbf;
      });

      formatter = forEachSystem (system: pkgs: pkgs.nixpkgs-fmt);

      packages = forEachSystem (system: pkgs: rec {
        kbf = pkgs.callPackage ./default.nix {
          nodejs = pkgs.nodejs_20;
          releaseName = builtins.toString (self.shortRev or self.dirtyShortRev or self.lastModified or "unknown");
          inherit (inputs.pnpm2nix.packages.${system}) mkPnpmPackage;
        };
        default = kbf;
      });
    };
}
