"use client";

import { Rubik } from "next/font/google";
import { PropsWithChildren } from "react";

// eslint-disable-next-line import/order
import { SandPackCSS } from "@/components/sandpack-styles";

import "styles/chrome-bug.css";
import "styles/main.css";

import { cn } from "@/lib/utils";

const rubik = Rubik({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-rubik",
});

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html className={cn("dark size-full antialiased", rubik.variable)}>
      <head>
        <SandPackCSS />
      </head>
      <body className="size-full">{children}</body>
    </html>
  );
}
