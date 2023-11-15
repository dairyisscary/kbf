{ mkPnpmPackage
, gitignoreSource
, nodejs-slim_20
, nodePackages
}: mkPnpmPackage rec {
  nodejs = nodejs-slim_20;
  pnpm = nodePackages.pnpm;

  src = gitignoreSource ./.;

  installPhase = ''
    mkdir -p $out/bin

    cp -r package.json $out
    cp -r dist/public $out/bin

    echo "#!${nodejs}/bin/node" > $out/bin/kbf.js
    cat dist/server.js >> $out/bin/kbf.js
    chmod +x $out/bin/kbf.js
  '';
}
