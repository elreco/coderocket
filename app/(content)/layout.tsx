"use client";

import { Rubik } from "next/font/google";
import { PropsWithChildren, useEffect } from "react";

// eslint-disable-next-line import/order
import { SandPackCSS } from "@/components/sandpack-styles";

import "@/styles/chrome-bug.css";
import "@/styles/main.css";

import { cn } from "@/lib/utils";

// eslint-disable-next-line import/order
import { auth } from "@webcontainer/api";

const rubik = Rubik({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-rubik",
});

export default function RootLayout({ children }: PropsWithChildren) {
  useEffect(() => {
    auth.init({
      clientId: "wc_api_elreco_626e67a60beb190de73c04873753f3d4",
      scope: "",
    });
  }, []);
  return (
    <html className={cn("dark size-full antialiased", rubik.variable)}>
      <head>
        <SandPackCSS />
      </head>
      <body className="size-full">{children}</body>
    </html>
  );
}
