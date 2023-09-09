{
  description = "Kim-Butler Finance";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

    devenv = {
      url = "github:cachix/devenv";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    gitignore = {
      url = "github:hercules-ci/gitignore.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    pnpm2nix = {
      url = "github:nzbr/pnpm2nix-nzbr";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs @ { nixpkgs, devenv, gitignore, pnpm2nix, ... }:
    let
      forAllSystems = projectionFn:
        nixpkgs.lib.genAttrs
          [ "x86_64-linux" "aarch64-darwin" ]
          (system: projectionFn system nixpkgs.legacyPackages.${system});
    in
    {
      formatter = forAllSystems (system: pkgs: pkgs.nixpkgs-fmt);

      packages = forAllSystems (system: pkgs: rec {
        default = kbf;
        kbf = pkgs.callPackage ./default.nix {
          inherit (gitignore.lib) gitignoreSource;
          inherit (pnpm2nix.packages.${system}) mkPnpmPackage;
        };
      });

      devShells = forAllSystems (system: pkgs: rec {
        default = kbf;
        kbf = (import ./shell.nix { inherit inputs pkgs system; });
      });
    };
}
