{
  description = "Kim-Butler Finance";

  inputs = {
    blueprint = {
      url = "github:numtide/blueprint";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    devenv = {
      url = "github:cachix/devenv";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs = inputs: inputs.blueprint {
    inherit inputs;
    prefix = "nix/";
    systems = [ "aarch64-darwin" "x86_64-linux" ];
  };
}
