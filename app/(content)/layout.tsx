import { auth } from "@webcontainer/api";
export const maxDuration = 300;
import { PropsWithChildren } from "react";

import "@/styles/chrome-bug.css";
import "@/styles/main.css";
import { SandPackCSS } from "@/components/sandpack-styles";

export default function RootLayout({ children }: PropsWithChildren) {
  auth.init({
    clientId: "wc_api_elreco_626e67a60beb190de73c04873753f3d4",
    scope: "",
  });
  return (
    <html className="size-full">
      <head>
        <SandPackCSS />
      </head>
      <body className="size-full">{children}</body>
    </html>
  );
}
