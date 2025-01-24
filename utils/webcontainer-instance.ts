"use client";
import { WebContainer } from "@webcontainer/api";

export let webcontainer: Promise<WebContainer> = new Promise(() => {
  // noop for ssr
});

// Vérifier si nous sommes dans un environnement navigateur
if (typeof window !== "undefined") {
  webcontainer = Promise.resolve()
    .then(() => {
      return WebContainer.boot({
        coep: "credentialless",
        forwardPreviewErrors: true, // Enable error forwarding from iframes
      });
    })
    .then(async (webcontainer) => {
      return webcontainer;
    });
}
