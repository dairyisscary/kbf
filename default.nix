{ lib
, mkPnpmPackage
, nodejs
}: mkPnpmPackage {
  inherit nodejs;

  src = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.gitTracked ./.;
  };

  buildInputs = [ nodejs ];

  installPhase = ''
    mkdir -p $out/bin

    cp -r package.json $out
    cp -r dist/public $out/bin

    echo "#!${nodejs}/bin/node" > $out/bin/kbf.js
    cat dist/server.js >> $out/bin/kbf.js
    chmod +x $out/bin/kbf.js
  '';
}
