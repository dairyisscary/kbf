{ pkgs, pname, ... }:
let
  inherit (pkgs) lib;

  version = "0.36.0";

  src = pkgs.fetchFromGitHub {
    owner = "oxc-project";
    repo = "oxc";
    tag = "oxfmt_v${version}";
    hash = "sha256-J5EChGADug+SEvhjStyS1s5kek5QNc2VrjEa5MEWTpA=";
  };
in
pkgs.oxfmt.overrideAttrs (oldAttrs: {
  inherit src version;

  pnpmDeps = pkgs.fetchPnpmDeps {
    inherit (oldAttrs) pname;
    inherit src version;
    pnpm = pkgs.pnpm_10;
    fetcherVersion = 2;
    hash = "sha256-VT+0joML1z5k8lP5stQe7Xmsfw4MfkJmocv/qzhk93I=";
  };

  cargoDeps = pkgs.rustPlatform.fetchCargoVendor {
    inherit (oldAttrs) pname;
    inherit src version;
    hash = "sha256-chNxYraN9upILXCqDQ/TrN3xiKhxKhZlN2HGrPF4qT8=";
  };

  postPatch = null;
})
