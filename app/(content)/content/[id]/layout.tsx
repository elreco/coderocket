/* eslint-disable import/order */
import { PropsWithChildren } from "react";

import "styles/content.css";
import "styles/iconoir.css";
import { Inter } from "next/font/google";
import clsx from "clsx";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className={clsx("antialiased", inter.variable)}>
      <body>{children}</body>
    </html>
  );
}
