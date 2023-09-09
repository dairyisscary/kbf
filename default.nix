{ mkPnpmPackage
, gitignoreSource
, nodejs-slim
, nodePackages
}: mkPnpmPackage rec {
  nodejs = nodejs-slim;
  pnpm = nodePackages.pnpm;

  # We install in place to avoid a permission issue with vite-plugin-inspect copying
  # files with readonly permissions from the nix store.
  # It also allows us to to just copy node_modules into $out
  installInPlace = true;

  src = gitignoreSource ./.;

  installPhase = ''
    mkdir -p $out/bin

    cp -r node_modules package.json $out
    cp -r dist/public $out/bin

    echo "#!${nodejs}/bin/node" > $out/bin/kbf.js
    cat dist/server.js >> $out/bin/kbf.js
    chmod +x $out/bin/kbf.js
  '';
}
