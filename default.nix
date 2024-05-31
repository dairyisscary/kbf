{ lib
, mkPnpmPackage
, nodejs
, releaseName
}: mkPnpmPackage {
  inherit nodejs;

  src = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.gitTracked ./.;
  };

  env.PUBLIC_RELEASE_NAME = releaseName;
  buildInputs = [ nodejs ];
  noDevDependencies = true;
  installInPlace = true;

  installPhase = ''
    runHook preInstall

    mkdir -p $out/{opt,bin}
    cp -r .output/{server,public} $out/opt
    echo -e "#!${nodejs}/bin/node $out/opt/server/index.mjs" > $out/bin/kbf
    chmod +x $out/bin/kbf

    runHook postInstall
  '';

  meta.mainProgram = "kbf";
}
