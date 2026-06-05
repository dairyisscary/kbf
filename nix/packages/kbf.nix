{ flake, pkgs, ... }:
let
  inherit (pkgs) lib;

  nodejs = pkgs.nodejs_24;
  pnpm = pkgs.pnpm_11.override { inherit nodejs; };

  fs = lib.fileset;
  getSrc = mapFn: fs.toSource rec {
    root = ./../..;
    fileset = mapFn (fs.gitTracked root);
  };
in
pkgs.stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "kbf";
  version = flake.shortRev or "dev";

  src = getSrc lib.id;

  pnpmDeps = pkgs.fetchPnpmDeps {
    inherit (finalAttrs) pname pnpmInstallFlags;
    inherit pnpm;
    src = getSrc (fs.intersection (fs.unions [
      ./../../package.json
      ./../../pnpm-lock.yaml
      ./../../pnpm-workspace.yaml
    ]));
    env = { inherit (finalAttrs.env) NODE_ENV; };
    fetcherVersion = 3;
    hash = "sha256-D/l4X0m9pPk+Dmgy7tjV6FjHcRqwFnzrnzOpbMqJfwo=";
  };

  pnpmInstallFlags = [ "--prod" ];

  env = {
    NODE_ENV = "production";
    PUBLIC_RELEASE_NAME = finalAttrs.version;
  };

  nativeBuildInputs = [ pnpm pkgs.pnpmConfigHook ];
  buildInputs = [ nodejs ];

  buildPhase = ''
    runHook preBuild

    pnpm exec vinxi build

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p $out/{opt,bin}
    cp -r .output/{server,public} $out/opt
    echo -e "#!${nodejs}/bin/node $out/opt/server/index.mjs" > $out/bin/kbf
    chmod +x $out/bin/kbf

    runHook postInstall
  '';

  passthru = {
    inherit nodejs pnpm;
  };

  meta.mainProgram = "kbf";
})
