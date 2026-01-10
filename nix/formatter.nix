{ pkgs, pname, ... }:
let
  treefmtConfigFile = (pkgs.formats.toml { }).generate "treefmt.toml" {
    formatter.nix = {
      command = "nixpkgs-fmt";
      includes = [ "*.nix" ];
    };
  };
  runtimeInputs = [
    pkgs.deadnix
    pkgs.nixpkgs-fmt
    pkgs.treefmt
  ];
in
pkgs.writeShellApplication {
  name = pname;

  inherit runtimeInputs;

  text = ''
    deadnix --edit "$@"
    treefmt --config-file "${treefmtConfigFile}" "$@"
  '';

  meta.description = "Format KBF";
}
