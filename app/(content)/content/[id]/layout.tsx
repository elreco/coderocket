/* eslint-disable import/order */
import { PropsWithChildren } from "react";

import { Inter } from "next/font/google";
import clsx from "clsx";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html className={clsx("size-full antialiased", inter.variable)}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Tailwind AI</title>
        <Script
          strategy="beforeInteractive"
          src="https://cdn.tailwindcss.com"
        />
        <link
          href="https://cdn.jsdelivr.net/gh/iconoir-icons/iconoir@main/css/iconoir.css"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
