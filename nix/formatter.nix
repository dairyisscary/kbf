{ perSystem, pkgs, pname, ... }:
let
  inherit (pkgs) lib treefmt;

  inherit (perSystem.self) oxfmt;

  treefmtConfigFile = (pkgs.formats.toml { }).generate "treefmt.toml" {
    formatter.deadnix = {
      command = lib.getExe pkgs.deadnix;
      args = [ "--edit" ];
      includes = [ "*.nix" ];
    };

    formatter.nixpkgs-fmt = {
      command = lib.getExe pkgs.nixpkgs-fmt;
      includes = [ "*.nix" ];
      priority = 1; # Happens _after_ deadnix
    };

    formatter.oxfmt = {
      command = lib.getExe oxfmt;
      includes = [
        "*.cjs"
        "*.css"
        "*.html"
        "*.js"
        "*.json"
        "*.jsx"
        "*.md"
        "*.mjs"
        "*.ts"
        "*.tsx"
        "*.yaml"
        "*.yml"
      ];
    };
  };
in
pkgs.stdenvNoCC.mkDerivation {
  name = pname;

  nativeBuildInputs = [
    pkgs.makeBinaryWrapper
  ];

  dontUnpack = true;
  dontConfigure = true;
  dontBuild = true;

  installPhase = ''
    runHook preInstall

    mkdir -p $out/bin

    makeWrapper "${lib.getExe treefmt}" "$out/bin/treefmt" \
      --append-flags "--config-file ${treefmtConfigFile}"

    runHook postInstall
  '';

  passthru = {
    inherit oxfmt;
  };

  inherit (treefmt) meta;
}
