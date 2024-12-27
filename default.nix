{ lib
, stdenvNoCC
, nodejs_22
, pnpm_9
, version
}:
let
  nodejs = nodejs_22;
  pnpm = pnpm_9;

  NODE_ENV = "production";

  fs = lib.fileset;
  getSrc = mapFn: fs.toSource rec {
    root = ./.;
    fileset = mapFn (fs.gitTracked root);
  };
in
stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "kbf";
  inherit version;

  src = getSrc lib.id;

  pnpmDeps = pnpm.fetchDeps {
    inherit (finalAttrs) pname;
    src = getSrc (fs.intersection (fs.unions [ ./package.json ./pnpm-lock.yaml ]));
    env = { inherit NODE_ENV; };
    hash = "sha256-foe/jPHuCMpEXIlRK7ci48//Uy/M7/lx1uYKx/zKTDE=";
  };

  env = {
    inherit NODE_ENV;
    PUBLIC_RELEASE_NAME = version;
  };
  nativeBuildInputs = [ pnpm.configHook ];
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
