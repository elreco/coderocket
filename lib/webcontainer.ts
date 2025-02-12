import { WebContainer } from "@webcontainer/api";

interface WebcontainerContext {
  loaded: boolean;
}

export const webcontainerContext: WebcontainerContext = {
  loaded: false,
};

export let webcontainer: Promise<WebContainer> = new Promise(() => {
  // noop for ssr
});

if (typeof window !== "undefined") {
  webcontainer = Promise.resolve()
    .then(() => {
      return WebContainer.boot({
        coep: "credentialless",
        forwardPreviewErrors: true,
      });
    })
    .then(async (webcontainer) => {
      webcontainerContext.loaded = true;
      return webcontainer;
    });
}
