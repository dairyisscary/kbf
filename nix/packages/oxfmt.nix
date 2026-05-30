{ pkgs, pname, ... }:
let
  inherit (pkgs) lib;

  version = "0.52.0";

  src = pkgs.fetchFromGitHub {
    owner = "oxc-project";
    repo = "oxc";
    tag = "oxfmt_v${version}";
    hash = "sha256-vf99nkcLSBbQ+2ZT19S3KlyW15oFho3JinL532Gx30g=";
  };
in
(pkgs.oxfmt.override { pnpm_10 = pkgs.pnpm_11; }).overrideAttrs (oldAttrs: {
  inherit src version;

  pnpmDeps = pkgs.fetchPnpmDeps {
    inherit (oldAttrs) pname;
    inherit src version;
    pnpm = pkgs.pnpm_11;
    fetcherVersion = 3;
    hash = "sha256-UaDLDjAlIeAD7JjmhNxJeoqQ6AqdSpD48dhG+QiiKk8=";
  };

  cargoDeps = pkgs.rustPlatform.fetchCargoVendor {
    inherit (oldAttrs) pname;
    inherit src version;
    hash = "sha256-vQiwaDMd1tCrFXmu3R0RHDjfRzUwv9cdJC+7PaD6SWU=";
  };
})
