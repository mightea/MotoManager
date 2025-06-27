{pkgs}: {
  channel = "stable-24.05";
  packages = [
    pkgs.pnpm
    pkgs.nodejs_20
  ];
  idx.extensions = [
    "svelte.svelte-vscode"
    "vue.volar"
  ];
  idx.previews = {
    previews = {
      web = {
        command = [
          "pnpm"
          "dev"
          "--port" 
          "$PORT"
        ];
        manager = "web";
      };
    };
  };
}