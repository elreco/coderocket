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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/iconoir-icons/iconoir@7.8.0/css/iconoir.css"
        />
        <title>Tailwind AI</title>
        <Script
          strategy="beforeInteractive"
          src="https://cdn.tailwindcss.com"
        />
        <Script
          strategy="beforeInteractive"
          src="https://cdn.jsdelivr.net/npm/chart.js"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
