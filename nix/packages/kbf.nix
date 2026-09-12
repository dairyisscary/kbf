{ flake, pkgs, ... }:
let
  inherit (pkgs) lib;

  nodejs-slim = pkgs.nodejs-slim_24;
  nodejs = nodejs-slim.out;
  pnpm = pkgs.pnpm_12.override { inherit nodejs-slim; };

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
    fetcherVersion = 4;
    hash = "sha256-okwPAVZww/2S1GIQwyA3Uj/ZYZxqPrdmDbHXG0th57s=";
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

    pnpm exec vite build

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p $out/{opt,bin}
    cp -r dist/{server,client} $out/opt
    cp -r node_modules $out/opt/server
    echo -e "#!${lib.getExe nodejs} $out/opt/server/node.js" > $out/bin/kbf
    chmod +x $out/bin/kbf

    runHook postInstall
  '';

  passthru = {
    inherit nodejs pnpm;
  };

  meta.mainProgram = "kbf";
})
