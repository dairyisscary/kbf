{ lib
, stdenvNoCC
, nodejs_20
, pnpm_8

, version
}:
let
  nodejs = nodejs_20;
  pnpm = pnpm_8;

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
    hash = "sha256-dLJ0Ya8PGznNcXndmvaXaM6uvAB+j8E4YyeKnBT4Cpc=";
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
